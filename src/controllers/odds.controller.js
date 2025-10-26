import oddsApiService from '../services/oddsApiService.js';
import probabilityCalculator from '../models/probabilityCalculator.js';
import dataCollector from '../services/dataCollector.js';
import { sendSuccess } from '../utils/response.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import config from '../config/env.js';
import blobStorage from '../services/blobStorage.js';

export const getNextMatch = async (req, res, next) => {
  try {
    const teamName = req.params.team;
    const nextMatch = await oddsApiService.getNextMatch(teamName);

    if (!nextMatch) {
      return sendSuccess(res, {
        hasMatch: false,
        message: 'No upcoming matches found',
      });
    }

    return sendSuccess(res, {
      hasMatch: true,
      ...nextMatch,
      formattedDate: oddsApiService.formatMatchDate(nextMatch.date),
    });
  } catch (error) {
    logger.error('Next match error:', error);
    next(error);
  }
};

export const getValueBets = async (req, res, next) => {
  try {
    const minEV = parseFloat(req.query.minEV) || 0.05;
    logger.info(`Scanning for value bets with min EV: ${(minEV * 100).toFixed(0)}%`);

    // Try to read from Vercel Blob first, fallback to local filesystem
    let playerFiles = [];
    let isUsingBlob = false;

    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        playerFiles = await blobStorage.listPlayerFiles();
        isUsingBlob = true;
        logger.info(`Using Vercel Blob - found ${playerFiles.length} players`);
      }
    } catch (error) {
      logger.warn('Failed to read from Vercel Blob, falling back to local files:', error.message);
    }

    // Fallback to local filesystem if blob failed or not available
    if (!isUsingBlob) {
      const dataDir = config.dataDir;
      if (!fs.existsSync(dataDir)) {
        return sendSuccess(res, { valueBets: [], message: 'No player data found' });
      }
      const files = fs.readdirSync(dataDir).filter(f => f.startsWith('player_') && f.endsWith('.json'));
      playerFiles = files.map(f => ({ pathname: f }));
      logger.info(`Using local files - found ${playerFiles.length} players`);
    }

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const statTypes = ['points', 'rebounds', 'assists'];
    let processedCount = 0;

    for (const playerFile of playerFiles) {
      let playerData;

      // Read player data based on source
      if (isUsingBlob) {
        playerData = await blobStorage.getPlayerData(playerFile.url);
      } else {
        playerData = JSON.parse(fs.readFileSync(path.join(config.dataDir, playerFile.pathname), 'utf8'));
      }

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
        logger.debug(`${playerName}: No upcoming match`);
        continue;
      }

      logger.debug(`${playerName} (${teamName}): Next match vs ${nextMatch.opponent}`);

      // Check each stat type
      for (const statType of statTypes) {
        try {
          // Get recent average for line estimation
          const recentGames = dataCollector.getRecentGames(playerData, 10);
          if (recentGames.length === 0) continue;

          const recentStats = recentGames.map(g => g[statType]).filter(v => v != null);
          const avgStat = recentStats.reduce((sum, val) => sum + val, 0) / recentStats.length;
          const estimatedLine = Math.round(avgStat * 2) / 2;

          // Calculate prediction
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
                projection: prediction.projection.toFixed(1),
              };

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
                projection: prediction.projection.toFixed(1),
              };

              res.write(`data: ${JSON.stringify({ type: 'bet', data: bet })}\n\n`);
            }
          }
        } catch (error) {
          logger.error(`Error analyzing ${playerName} ${statType}:`, error.message);
        }
      }

      processedCount++;

      // Send progress update
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        processed: processedCount,
        total: playerFiles.length,
        player: playerName,
      })}\n\n`);
    }

    // Send completion
    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.end();

    logger.info(`Scan complete - processed ${processedCount} players`);
  } catch (error) {
    logger.error('Value bets error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
};
