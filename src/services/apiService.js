import axios from 'axios';
import config from '../config/env.js';
import cacheService from './cacheService.js';
import logger from '../utils/logger.js';

class APIService {
  constructor() {
    this.apiKey = config.apiSportsKey;
    this.baseUrl = config.apiSportsBaseUrl;

    if (!this.apiKey) {
      throw new Error('API_SPORTS_KEY not found in environment variables');
    }
  }

  /**
   * Make API request with caching
   */
  async makeRequest(endpoint, params = {}, useCache = true) {
    const cacheKey = cacheService.getCacheKey(endpoint, params);

    // Check cache first
    if (useCache) {
      const cachedData = cacheService.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Make API request
    try {
      logger.info(`API request: ${endpoint}`, params);
      const response = await axios.get(`${this.baseUrl}/${endpoint}`, {
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': 'v1.basketball.api-sports.io'
        },
        params
      });

      // Cache the response
      if (useCache) {
        cacheService.set(cacheKey, response.data);
      }

      return response.data;
    } catch (error) {
      logger.error(`API Error (${endpoint}):`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get leagues (NBA, Euroleague, etc.)
   */
  async getLeagues() {
    const data = await this.makeRequest('leagues');
    return data.response;
  }

  /**
   * Get teams for a specific league and season
   */
  async getTeams(leagueId, season) {
    const data = await this.makeRequest('teams', { league: leagueId, season });
    return data.response;
  }

  /**
   * Get games for a specific team and season
   */
  async getGames(teamId, season, leagueId = 12) {
    const data = await this.makeRequest('games', {
      team: teamId,
      league: leagueId,
      season
    });
    return data.response;
  }

  /**
   * Get game statistics (includes player stats)
   */
  async getGameStatistics(gameId) {
    const data = await this.makeRequest('games/statistics', { id: gameId });
    return data.response;
  }

  /**
   * Get player statistics for a season
   */
  async getPlayerSeasonStats(playerId, season) {
    const data = await this.makeRequest('players/statistics', {
      id: playerId,
      season
    });
    return data.response;
  }

  /**
   * Search for a player by name
   */
  async searchPlayer(playerName) {
    const data = await this.makeRequest('players', { search: playerName }, false);
    return data.response;
  }

  /**
   * Get player information
   */
  async getPlayer(playerId) {
    const data = await this.makeRequest('players', { id: playerId });
    return data.response;
  }

  /**
   * Get standings for a league and season
   */
  async getStandings(leagueId, season) {
    const data = await this.makeRequest('standings', { league: leagueId, season });
    return data.response;
  }

  /**
   * Get games by date
   */
  async getGamesByDate(date, leagueId = null) {
    const params = { date };
    if (leagueId) params.league = leagueId;
    const data = await this.makeRequest('games', params);
    return data.response;
  }

  /**
   * Get player statistics for a specific game
   */
  async getGamePlayerStats(gameId) {
    const data = await this.makeRequest('games/statistics/players', { id: gameId });
    return data.response;
  }

  /**
   * Get player's game-by-game statistics for a season
   * This requires getting all team games, then fetching player stats for each game
   */
  async getPlayerGameLogs(playerId, teamId, season, leagueId = 12) {
    // First, get all games for the team in this season
    const games = await this.getGames(teamId, season, leagueId);

    if (!games || games.length === 0) {
      return [];
    }

    logger.info(`Found ${games.length} team games, fetching player stats...`);

    // Fetch player stats for each game
    const playerGameLogs = [];

    for (const game of games) {
      try {
        const gamePlayerStats = await this.getGamePlayerStats(game.id);

        // Find this player's stats in the game
        const playerStats = gamePlayerStats.find(p => p.player.id === playerId);

        if (playerStats) {
          // Combine game info with player stats
          playerGameLogs.push({
            ...playerStats,
            game: {
              ...game,
              ...playerStats.game
            }
          });
        }
      } catch (error) {
        // Game might not have stats available (future games, cancelled, etc.)
        logger.debug(`Skipping game ${game.id}: ${error.message}`);
      }
    }

    logger.info(`Retrieved stats for ${playerGameLogs.length} games where player participated`);
    return playerGameLogs;
  }

  /**
   * Get live games
   */
  async getLiveGames(leagueId = null) {
    const params = { live: 'all' };
    if (leagueId) params.league = leagueId;
    const data = await this.makeRequest('games', params, false);
    return data.response;
  }
}

export default new APIService();
