/**
 * Vercel Blob Storage Service
 * Handles all interactions with Vercel Blob for player data storage
 */

import { list, head } from '@vercel/blob';
import logger from '../utils/logger.js';

class BlobStorage {
  /**
   * Get all player file paths from Vercel Blob
   * @returns {Promise<Array>} Array of player file URLs and metadata
   */
  async listPlayerFiles() {
    try {
      // List all files starting with "player_"
      const { blobs } = await list({
        prefix: 'player_',
        limit: 1000, // Adjust if you have more than 1000 players
      });

      logger.info(`Found ${blobs.length} player files in Vercel Blob`);
      return blobs;
    } catch (error) {
      logger.error('Error listing player files from Vercel Blob:', error);
      throw error;
    }
  }

  /**
   * Get player data from Vercel Blob
   * @param {string} url - The blob URL
   * @returns {Promise<Object>} Player data
   */
  async getPlayerData(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      logger.error(`Error fetching player data from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Count total players in Vercel Blob
   * @returns {Promise<number>} Number of player files
   */
  async countPlayers() {
    try {
      const { blobs } = await list({
        prefix: 'player_',
        limit: 1000,
      });
      return blobs.length;
    } catch (error) {
      logger.error('Error counting players in Vercel Blob:', error);
      return 0;
    }
  }
}

export default new BlobStorage();
