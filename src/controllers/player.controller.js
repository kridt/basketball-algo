import dataCollector from '../services/dataCollector.js';
import storageService from '../services/storageService.js';
import apiService from '../services/apiService.js';
import { sendSuccess, sendError, sendNotFound } from '../utils/response.js';
import { HTTP_STATUS, ERROR_MESSAGES, API_CONFIG } from '../config/constants.js';
import { SEASONS } from '../config/constants.js';
import logger from '../utils/logger.js';

export const collect = async (req, res, next) => {
  try {
    const { playerName, teamName, seasons } = req.body;

    const seasonList = seasons || SEASONS.DEFAULT_COLLECTION;

    // Search for player
    const playerResults = await apiService.searchPlayer(playerName);
    if (!playerResults || playerResults.length === 0) {
      return sendNotFound(res, `${ERROR_MESSAGES.PLAYER_NOT_FOUND}: "${playerName}"`);
    }

    const player = playerResults[0];

    // Search for team
    const season = seasonList[0];
    const teams = await apiService.getTeams(API_CONFIG.NBA_LEAGUE_ID, season);
    const team = teams.find(t => t.name.toLowerCase().includes(teamName.toLowerCase()));

    if (!team) {
      return sendNotFound(res, `${ERROR_MESSAGES.TEAM_NOT_FOUND}: "${teamName}"`);
    }

    // Collect data for all seasons
    const seasonData = [];
    for (const seasonStr of seasonList) {
      const playerStats = await apiService.getPlayerGameLogs(
        player.id,
        team.id,
        seasonStr,
        API_CONFIG.NBA_LEAGUE_ID
      );

      if (playerStats && playerStats.length > 0) {
        seasonData.push({
          season: seasonStr,
          team: team.name,
          games: dataCollector.parsePlayerStats(playerStats),
        });
      }
    }

    if (seasonData.length === 0) {
      return sendNotFound(res, 'No game data found for this player/team combination');
    }

    // Save data
    const playerData = {
      player: {
        id: player.id,
        name: player.name,
        firstname: player.name.split(' ')[0] || '',
        lastname: player.name.split(' ').slice(1).join(' ') || '',
      },
      seasons: seasonData,
      lastUpdated: new Date().toISOString(),
    };

    await dataCollector.savePlayerData(player.id, playerData);

    return sendSuccess(res, {
      player: playerData.player.name,
      team: team.name,
      seasons: seasonData.map(s => s.season),
      totalGames: dataCollector.getAllGames(playerData).length,
    }, HTTP_STATUS.CREATED);
  } catch (error) {
    logger.error('Collection error:', error);
    next(error);
  }
};

export const getAllPlayers = async (req, res, next) => {
  try {
    const playersList = await storageService.listAllPlayers();

    const players = playersList.map(item => {
      const data = item.data;
      const latestSeason = data.seasons && data.seasons.length > 0 ? data.seasons[data.seasons.length - 1] : null;
      return {
        id: data.player.id,
        name: data.player.name,
        team: latestSeason ? latestSeason.team : null,
        seasons: data.seasons.map(s => s.season),
        totalGames: dataCollector.getAllGames(data).length,
        lastUpdated: data.lastUpdated,
      };
    });

    return sendSuccess(res, { players });
  } catch (error) {
    logger.error('Error loading players:', error);
    next(error);
  }
};

export const getPlayer = async (req, res, next) => {
  try {
    const playerData = await dataCollector.loadPlayerDataByName(req.params.name);

    if (!playerData) {
      return sendNotFound(res, ERROR_MESSAGES.NO_PLAYER_DATA);
    }

    return sendSuccess(res, {
      player: playerData.player,
      seasons: playerData.seasons.map(s => ({
        season: s.season,
        games: s.games.length,
      })),
      totalGames: dataCollector.getAllGames(playerData).length,
      lastUpdated: playerData.lastUpdated,
    });
  } catch (error) {
    logger.error('Player data error:', error);
    next(error);
  }
};
