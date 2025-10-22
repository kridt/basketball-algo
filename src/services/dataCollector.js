import apiService from './apiService.js';
import fs from 'fs';
import path from 'path';

class DataCollector {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.playersFile = path.join(this.dataDir, 'players.json');
    this.gamesFile = path.join(this.dataDir, 'games.json');

    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Collect comprehensive player data for analysis
   */
  async collectPlayerData(playerName, seasons = ['2022-2023', '2023-2024', '2024-2025']) {
    console.log(`\nCollecting data for ${playerName}...`);

    // Search for player
    const searchResults = await apiService.searchPlayer(playerName);
    if (!searchResults || searchResults.length === 0) {
      throw new Error(`Player "${playerName}" not found`);
    }

    const player = searchResults[0];
    const playerId = player.id;

    console.log(`Found: ${player.name} (ID: ${playerId})`);

    // We need to get the player's team(s) to fetch their games
    // For NBA, we'll search for teams and try to find which team(s) the player played for
    console.log('Finding player team(s)...');

    // Collect data for each season
    const seasonData = [];
    for (const season of seasons) {
      console.log(`\nFetching ${season} season data...`);
      try {
        // Get NBA teams for this season
        const teams = await apiService.getTeams(12, season);  // 12 = NBA league ID

        // Try to find which team the player played for by checking a few teams
        // We'll need to make educated guesses based on common teams or try multiple
        let playerStats = null;
        let foundTeam = null;

        // Strategy: Get games by date and find games where player participated
        // Or try major teams first
        const majorTeams = teams.filter(t =>
          t.name.includes('Lakers') || t.name.includes('Warriors') ||
          t.name.includes('Celtics') || t.name.includes('Heat') ||
          t.name.includes('Bucks') || t.name.includes('76ers') ||
          t.name.includes('Nets') || t.name.includes('Suns') ||
          t.name.includes('Mavericks') || t.name.includes('Clippers')
        );

        // Try to find the player on a team by checking first game
        for (const team of teams.slice(0, 5)) {  // Check first 5 teams as a start
          try {
            const teamGames = await apiService.getGames(team.id, season, 12);
            if (teamGames && teamGames.length > 0) {
              // Check first game for this player
              const firstGameStats = await apiService.getGamePlayerStats(teamGames[0].id);
              const playerInGame = firstGameStats.find(p => p.player.id === playerId);

              if (playerInGame) {
                console.log(`  Found player on team: ${team.name}`);
                foundTeam = team;
                playerStats = await apiService.getPlayerGameLogs(playerId, team.id, season, 12);
                break;
              }
            }
          } catch (err) {
            // Continue to next team
          }
        }

        if (playerStats && playerStats.length > 0) {
          seasonData.push({
            season,
            team: foundTeam ? foundTeam.name : 'Unknown',
            games: this.parsePlayerStats(playerStats)
          });
          console.log(`  ✓ Found ${playerStats.length} games`);
        } else {
          console.log(`  ✗ No data for ${season} (player not found on checked teams)`);
        }
      } catch (error) {
        console.log(`  ✗ Error fetching ${season}: ${error.message}`);
      }
    }

    if (seasonData.length === 0) {
      throw new Error('No historical data found for player');
    }

    const playerData = {
      player: {
        id: playerId,
        name: player.name,
        firstname: player.name.split(' ')[0] || '',
        lastname: player.name.split(' ').slice(1).join(' ') || ''
      },
      seasons: seasonData,
      lastUpdated: new Date().toISOString()
    };

    // Save to file
    this.savePlayerData(playerId, playerData);

    return playerData;
  }

  /**
   * Parse player statistics from API response
   */
  parsePlayerStats(statsArray) {
    return statsArray.map(stat => {
      const game = stat.game || {};
      const team = stat.team || {};
      const points = parseInt(stat.points) || 0;
      const rebounds = parseInt(stat.rebounds?.total) || 0;
      const assists = parseInt(stat.assists) || 0;
      const minutes = stat.minutes || '0';

      return {
        gameId: game.id,
        date: game.date,
        opponent: this.getOpponentName(stat),
        home: team.id === game.teams?.home?.id,
        points,
        rebounds,
        assists,
        pra: points + rebounds + assists,
        points_assists: points + assists,
        points_rebounds: points + rebounds,
        rebounds_assists: rebounds + assists,
        minutes: this.parseMinutes(minutes),
        fgm: parseInt(stat.field_goals?.total) || 0,
        fga: parseInt(stat.field_goals?.attempts) || 0,
        ftm: parseInt(stat.freethrows_goals?.total) || 0,
        fta: parseInt(stat.freethrows_goals?.attempts) || 0,
        tpm: parseInt(stat.threepoint_goals?.total) || 0,
        tpa: parseInt(stat.threepoint_goals?.attempts) || 0,
        offReb: 0,  // Not provided in this API response
        defReb: 0,  // Not provided in this API response
        steals: 0,  // Not provided in this API response
        blocks: 0,  // Not provided in this API response
        turnovers: 0,  // Not provided in this API response
        plusMinus: null  // Not provided in this API response
      };
    });
  }

  /**
   * Get opponent team name from stat object
   */
  getOpponentName(stat) {
    const game = stat.game || {};
    const team = stat.team || {};
    const teams = game.teams || {};

    if (team.id === teams.home?.id) {
      return teams.away?.name || 'Unknown';
    } else {
      return teams.home?.name || 'Unknown';
    }
  }

  /**
   * Parse minutes string (e.g., "32:45" -> 32.75)
   */
  parseMinutes(minStr) {
    if (!minStr || minStr === '0') return 0;
    const parts = minStr.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return minutes + (seconds / 60);
  }

  /**
   * Save player data to file
   */
  savePlayerData(playerId, data) {
    const filename = path.join(this.dataDir, `player_${playerId}.json`);
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`\n✓ Data saved to ${filename}`);
  }

  /**
   * Load player data from file
   */
  loadPlayerData(playerId) {
    const filename = path.join(this.dataDir, `player_${playerId}.json`);
    if (!fs.existsSync(filename)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  }

  /**
   * Load player data by name (searches all player files)
   */
  loadPlayerDataByName(playerName) {
    const files = fs.readdirSync(this.dataDir).filter(f => f.startsWith('player_'));
    const nameLower = playerName.toLowerCase();

    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(this.dataDir, file), 'utf8'));
      if (data.player.name.toLowerCase().includes(nameLower)) {
        return data;
      }
    }
    return null;
  }

  /**
   * Get all games from collected data
   */
  getAllGames(playerData) {
    const games = [];
    for (const season of playerData.seasons) {
      games.push(...season.games);
    }
    // Sort by date (most recent first)
    const sortedGames = games.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Ensure combined stats exist (for backward compatibility with old data)
    return sortedGames.map(game => {
      if (!game.points_assists) {
        game.points_assists = (game.points || 0) + (game.assists || 0);
      }
      if (!game.points_rebounds) {
        game.points_rebounds = (game.points || 0) + (game.rebounds || 0);
      }
      if (!game.rebounds_assists) {
        game.rebounds_assists = (game.rebounds || 0) + (game.assists || 0);
      }
      return game;
    });
  }

  /**
   * Get recent games
   */
  getRecentGames(playerData, count = 10) {
    return this.getAllGames(playerData).slice(0, count);
  }

  /**
   * Get current season games
   */
  getCurrentSeasonGames(playerData, season = '2025') {
    const seasonData = playerData.seasons.find(s => s.season === season);
    return seasonData ? seasonData.games : [];
  }

  /**
   * Filter games by criteria
   */
  filterGames(games, criteria = {}) {
    let filtered = [...games];

    if (criteria.home !== undefined) {
      filtered = filtered.filter(g => g.home === criteria.home);
    }

    if (criteria.minMinutes !== undefined) {
      filtered = filtered.filter(g => g.minutes >= criteria.minMinutes);
    }

    if (criteria.opponent) {
      filtered = filtered.filter(g =>
        g.opponent.toLowerCase().includes(criteria.opponent.toLowerCase())
      );
    }

    if (criteria.dateFrom) {
      filtered = filtered.filter(g => new Date(g.date) >= new Date(criteria.dateFrom));
    }

    if (criteria.dateTo) {
      filtered = filtered.filter(g => new Date(g.date) <= new Date(criteria.dateTo));
    }

    return filtered;
  }

  /**
   * Collect opponent defensive statistics
   */
  async collectOpponentDefenseStats(teamName, season = '2025') {
    console.log(`\nCollecting defensive stats for ${teamName}...`);

    // This would require additional API calls to get team defensive statistics
    // For now, return a placeholder structure
    return {
      team: teamName,
      season,
      defensiveRating: null,
      pointsAllowedPerGame: null,
      reboundsAllowedPerGame: null,
      assistsAllowedPerGame: null,
      // These would be calculated from actual game data
      lastUpdated: new Date().toISOString()
    };
  }
}

export default new DataCollector();
