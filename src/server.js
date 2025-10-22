import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import probabilityCalculator from './models/probabilityCalculator.js';
import dataCollector from './services/dataCollector.js';
import oddsApiService from './services/oddsApiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes

/**
 * POST /api/predict
 * Calculate probability for a single prop
 */
app.post('/api/predict', async (req, res) => {
  try {
    const { playerName, statType, line, gameContext } = req.body;

    if (!playerName || !statType || !line) {
      return res.status(400).json({
        error: 'Missing required fields: playerName, statType, line'
      });
    }

    const result = await probabilityCalculator.calculateProbability(
      playerName,
      statType,
      parseFloat(line),
      gameContext || {}
    );

    res.json(result);

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/analyze
 * Analyze multiple props for a player
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { playerName, lines, gameContext } = req.body;

    if (!playerName || !lines) {
      return res.status(400).json({
        error: 'Missing required fields: playerName, lines'
      });
    }

    const results = await probabilityCalculator.calculateAllProps(
      playerName,
      lines,
      gameContext || {}
    );

    res.json(results);

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/collect
 * Collect player data from API
 */
app.post('/api/collect', async (req, res) => {
  try {
    const { playerName, teamName, seasons } = req.body;

    if (!playerName || !teamName) {
      return res.status(400).json({
        error: 'Missing required fields: playerName and teamName'
      });
    }

    const seasonList = seasons || ['2023-2024', '2024-2025'];

    // Import apiService dynamically to use it here
    const apiService = (await import('./services/apiService.js')).default;

    // Search for player
    const playerResults = await apiService.searchPlayer(playerName);
    if (!playerResults || playerResults.length === 0) {
      return res.status(404).json({
        error: `Player "${playerName}" not found`
      });
    }

    const player = playerResults[0];

    // Search for team
    const season = seasonList[0];
    const teams = await apiService.getTeams(12, season);
    const team = teams.find(t => t.name.toLowerCase().includes(teamName.toLowerCase()));

    if (!team) {
      return res.status(404).json({
        error: `Team "${teamName}" not found`
      });
    }

    // Collect data for all seasons
    const seasonData = [];
    for (const seasonStr of seasonList) {
      const playerStats = await apiService.getPlayerGameLogs(player.id, team.id, seasonStr, 12);

      if (playerStats && playerStats.length > 0) {
        seasonData.push({
          season: seasonStr,
          team: team.name,
          games: dataCollector.parsePlayerStats(playerStats)
        });
      }
    }

    if (seasonData.length === 0) {
      return res.status(404).json({
        error: 'No game data found for this player/team combination'
      });
    }

    // Save data
    const playerData = {
      player: {
        id: player.id,
        name: player.name,
        firstname: player.name.split(' ')[0] || '',
        lastname: player.name.split(' ').slice(1).join(' ') || ''
      },
      seasons: seasonData,
      lastUpdated: new Date().toISOString()
    };

    dataCollector.savePlayerData(player.id, playerData);

    res.json({
      success: true,
      player: playerData.player.name,
      team: team.name,
      seasons: seasonData.map(s => s.season),
      totalGames: dataCollector.getAllGames(playerData).length
    });

  } catch (error) {
    console.error('Collection error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/players
 * Get all saved players
 */
app.get('/api/players', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');

    const dataDir = path.join(process.cwd(), 'data');

    if (!fs.existsSync(dataDir)) {
      return res.json({ players: [] });
    }

    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('player_') && f.endsWith('.json'));

    const players = files.map(file => {
      const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
      const latestSeason = data.seasons && data.seasons.length > 0 ? data.seasons[data.seasons.length - 1] : null;
      return {
        id: data.player.id,
        name: data.player.name,
        team: latestSeason ? latestSeason.team : null,
        seasons: data.seasons.map(s => s.season),
        totalGames: dataCollector.getAllGames(data).length,
        lastUpdated: data.lastUpdated
      };
    });

    res.json({ players });

  } catch (error) {
    console.error('Error loading players:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/player/:name
 * Get cached player data
 */
app.get('/api/player/:name', async (req, res) => {
  try {
    const playerData = dataCollector.loadPlayerDataByName(req.params.name);

    if (!playerData) {
      return res.status(404).json({
        error: 'Player data not found. Run /api/collect first.'
      });
    }

    res.json({
      player: playerData.player,
      seasons: playerData.seasons.map(s => ({
        season: s.season,
        games: s.games.length
      })),
      totalGames: dataCollector.getAllGames(playerData).length,
      lastUpdated: playerData.lastUpdated
    });

  } catch (error) {
    console.error('Player data error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/edge
 * Calculate edge vs bookmaker odds
 */
app.post('/api/edge', async (req, res) => {
  try {
    const { playerName, statType, line, bookmakerOdds, gameContext } = req.body;

    if (!playerName || !statType || !line || !bookmakerOdds) {
      return res.status(400).json({
        error: 'Missing required fields: playerName, statType, line, bookmakerOdds'
      });
    }

    // Get probability
    const result = await probabilityCalculator.calculateProbability(
      playerName,
      statType,
      parseFloat(line),
      gameContext || {}
    );

    if (result.error) {
      return res.status(400).json(result);
    }

    // Calculate edge
    const edge = probabilityCalculator.calculateEdge(
      result.probability.rawOver,
      parseInt(bookmakerOdds)
    );

    res.json({
      ...result,
      edge
    });

  } catch (error) {
    console.error('Edge calculation error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/next-match/:team
 * Get next match for a team
 */
app.get('/api/next-match/:team', async (req, res) => {
  try {
    const teamName = req.params.team;
    const nextMatch = await oddsApiService.getNextMatch(teamName);

    if (!nextMatch) {
      return res.json({
        hasMatch: false,
        message: 'No upcoming matches found'
      });
    }

    res.json({
      hasMatch: true,
      ...nextMatch,
      formattedDate: oddsApiService.formatMatchDate(nextMatch.date)
    });

  } catch (error) {
    console.error('Next match error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/predict-with-odds
 * Calculate probability with EV based on bookmaker odds
 */
app.post('/api/predict-with-odds', async (req, res) => {
  try {
    const { playerName, statType, line, gameContext, eventId } = req.body;

    if (!playerName || !statType || !line) {
      return res.status(400).json({
        error: 'Missing required fields: playerName, statType, line'
      });
    }

    // Get basic prediction
    const prediction = await probabilityCalculator.calculateProbability(
      playerName,
      statType,
      parseFloat(line),
      gameContext || {}
    );

    // If eventId provided, fetch odds and calculate EV
    if (eventId && !prediction.error) {
      console.log(`[Odds] Fetching odds for event ${eventId}, player: ${playerName}, stat: ${statType}`);
      const oddsData = await oddsApiService.getEventOdds(eventId);

      if (oddsData) {
        console.log(`[Odds] Odds data received for event ${eventId}`);
        const playerProps = oddsApiService.findPlayerPropsAllBookmakers(oddsData, playerName, statType);

        if (playerProps) {
          console.log(`[Odds] Found player props for ${playerName} ${statType} from bookmakers:`, Object.keys(playerProps));

          const ourOverProb = prediction.probability.rawOver;
          const ourUnderProb = prediction.probability.rawUnder;

          // Process odds from each bookmaker
          const bookmakerOdds = {};
          let bestOverEV = -Infinity;
          let bestUnderEV = -Infinity;
          let bestBookmakerOver = null;
          let bestBookmakerUnder = null;

          for (const [bookmakerName, prop] of Object.entries(playerProps)) {
            // Calculate implied probabilities from bookmaker odds
            const impliedOverProb = oddsApiService.calculateImpliedProbability(prop.overOdds);
            const impliedUnderProb = oddsApiService.calculateImpliedProbability(prop.underOdds);

            // Calculate EV for both over and under
            const overEV = oddsApiService.calculateEV(ourOverProb, prop.overOdds);
            const underEV = oddsApiService.calculateEV(ourUnderProb, prop.underOdds);

            console.log(`[Odds] ${bookmakerName} - Over EV: ${(overEV * 100).toFixed(2)}%, Under EV: ${(underEV * 100).toFixed(2)}%`);

            bookmakerOdds[bookmakerName] = {
              line: prop.line,
              overOdds: prop.overOdds,
              underOdds: prop.underOdds,
              impliedOverProb: (impliedOverProb * 100).toFixed(2) + '%',
              impliedUnderProb: (impliedUnderProb * 100).toFixed(2) + '%',
              overEV: (overEV * 100).toFixed(2) + '%',
              underEV: (underEV * 100).toFixed(2) + '%',
              overEVRaw: overEV,
              underEVRaw: underEV,
              marketName: prop.marketName,
              updatedAt: prop.updatedAt
            };

            // Track best EV
            if (overEV > bestOverEV) {
              bestOverEV = overEV;
              bestBookmakerOver = bookmakerName;
            }
            if (underEV > bestUnderEV) {
              bestUnderEV = underEV;
              bestBookmakerUnder = bookmakerName;
            }
          }

          // Determine overall recommendation based on best EV
          let recommendation = 'NO VALUE';
          let bestBet = null;
          let bestBookmaker = null;

          if (bestOverEV > 0.05 && bestOverEV > bestUnderEV) {
            recommendation = 'OVER';
            bestBet = 'OVER';
            bestBookmaker = bestBookmakerOver;
          } else if (bestUnderEV > 0.05) {
            recommendation = 'UNDER';
            bestBet = 'UNDER';
            bestBookmaker = bestBookmakerUnder;
          }

          prediction.odds = {
            available: true,
            bookmakers: bookmakerOdds,
            bestValue: {
              bet: bestBet,
              bookmaker: bestBookmaker,
              ev: bestBet === 'OVER' ? (bestOverEV * 100).toFixed(2) + '%' : (bestUnderEV * 100).toFixed(2) + '%',
              evRaw: bestBet === 'OVER' ? bestOverEV : bestUnderEV
            },
            recommendation
          };
        } else {
          console.log(`[Odds] Player ${playerName} not found in any bookmaker odds for ${statType}`);
          prediction.odds = {
            available: false,
            message: 'Player not found in odds'
          };
        }
      } else {
        console.log(`[Odds] No odds data returned for event ${eventId}`);
        prediction.odds = {
          available: false,
          message: 'Odds not available for this event'
        };
      }
    } else {
      console.log(`[Odds] No event ID provided or prediction error exists`);
      prediction.odds = {
        available: false,
        message: 'No event ID provided'
      };
    }

    res.json(prediction);

  } catch (error) {
    console.error('Prediction with odds error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/value-bets
 * Find all players with positive EV bets for upcoming games (streaming)
 */
app.get('/api/value-bets', async (req, res) => {
  try {
    const minEV = parseFloat(req.query.minEV) || 0.05; // Default 5% minimum EV
    console.log(`\n[Value Bets] Scanning for opportunities with min EV: ${(minEV * 100).toFixed(0)}%`);

    // Get all players
    const fs = await import('fs');
    const path = await import('path');
    const dataDir = path.join(process.cwd(), 'data');

    if (!fs.existsSync(dataDir)) {
      return res.json({ valueBets: [], message: 'No player data found' });
    }

    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('player_') && f.endsWith('.json'));
    console.log(`[Value Bets] Found ${files.length} players to analyze`);

    // Set up Server-Sent Events for progressive loading
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const statTypes = ['points', 'rebounds', 'assists'];
    let processedCount = 0;

    for (const file of files) {
      const playerData = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
      const playerName = playerData.player.name;

      // Get latest team
      const latestSeason = playerData.seasons && playerData.seasons.length > 0
        ? playerData.seasons[playerData.seasons.length - 1]
        : null;

      if (!latestSeason) continue;

      const teamName = latestSeason.team;

      // Get next match
      const nextMatch = await oddsApiService.getNextMatch(teamName);
      if (!nextMatch) {
        console.log(`[Value Bets] ${playerName}: No upcoming match`);
        continue;
      }

      console.log(`[Value Bets] ${playerName} (${teamName}): Next match vs ${nextMatch.opponent}`);

      // Check each stat type
      for (const statType of statTypes) {
        try {
          // Get recent average for line estimation
          const recentGames = dataCollector.getRecentGames(playerData, 10);
          if (recentGames.length === 0) continue;

          const recentStats = recentGames.map(g => g[statType]).filter(v => v != null);
          const avgStat = recentStats.reduce((sum, val) => sum + val, 0) / recentStats.length;
          const estimatedLine = Math.round(avgStat * 2) / 2; // Round to nearest 0.5

          // Calculate prediction with odds
          const prediction = await probabilityCalculator.calculateProbability(
            playerName,
            statType,
            estimatedLine,
            { isHome: nextMatch.isHome }
          );

          if (prediction.error) continue;

          // Fetch odds
          const oddsData = await oddsApiService.getEventOdds(nextMatch.id);
          if (!oddsData) continue;

          const playerProps = oddsApiService.findPlayerPropsAllBookmakers(oddsData, playerName, statType);
          if (!playerProps) continue;

          // Calculate EV for each bookmaker
          const ourOverProb = prediction.probability.rawOver;
          const ourUnderProb = prediction.probability.rawUnder;

          for (const [bookmakerName, prop] of Object.entries(playerProps)) {
            const overEV = oddsApiService.calculateEV(ourOverProb, prop.overOdds);
            const underEV = oddsApiService.calculateEV(ourUnderProb, prop.underOdds);

            // Check if over has positive EV
            if (overEV > minEV) {
              const bet = {
                player: playerName,
                team: teamName,
                opponent: nextMatch.opponent,
                isHome: nextMatch.isHome,
                matchDate: nextMatch.date,
                statType: statType.toUpperCase(),
                bet: 'OVER',
                line: prop.line,
                odds: prop.overOdds,
                bookmaker: bookmakerName,
                ev: (overEV * 100).toFixed(2) + '%',
                evRaw: overEV,
                ourProbability: (ourOverProb * 100).toFixed(1) + '%',
                impliedProbability: ((1 / prop.overOdds) * 100).toFixed(1) + '%',
                projection: prediction.projection.toFixed(1)
              };

              // Send bet immediately via SSE
              res.write(`data: ${JSON.stringify({ type: 'bet', data: bet })}\n\n`);
            }

            // Check if under has positive EV
            if (underEV > minEV) {
              const bet = {
                player: playerName,
                team: teamName,
                opponent: nextMatch.opponent,
                isHome: nextMatch.isHome,
                matchDate: nextMatch.date,
                statType: statType.toUpperCase(),
                bet: 'UNDER',
                line: prop.line,
                odds: prop.underOdds,
                bookmaker: bookmakerName,
                ev: (underEV * 100).toFixed(2) + '%',
                evRaw: underEV,
                ourProbability: (ourUnderProb * 100).toFixed(1) + '%',
                impliedProbability: ((1 / prop.underOdds) * 100).toFixed(1) + '%',
                projection: prediction.projection.toFixed(1)
              };

              // Send bet immediately via SSE
              res.write(`data: ${JSON.stringify({ type: 'bet', data: bet })}\n\n`);
            }
          }
        } catch (error) {
          console.error(`[Value Bets] Error analyzing ${playerName} ${statType}:`, error.message);
        }
      }

      processedCount++;

      // Send progress update
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        processed: processedCount,
        total: files.length,
        player: playerName
      })}\n\n`);
    }

    // Send completion message
    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.end();

    console.log(`[Value Bets] Scan complete - processed ${processedCount} players`);

  } catch (error) {
    console.error('Value bets error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`\n🏀 Basketball Probability Algorithm`);
  console.log(`🌐 Server running at http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api\n`);
});

export default app;
