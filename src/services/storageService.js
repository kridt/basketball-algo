import fs from 'fs';
import path from 'path';
import config from '../config/env.js';
import logger from '../utils/logger.js';

// Conditional import for Vercel Blob (works both on Vercel and locally with token)
let blobModule = null;
if (process.env.BLOB_READ_WRITE_TOKEN) {
  try {
    blobModule = await import('@vercel/blob');
    logger.info('Vercel Blob storage initialized');
  } catch (error) {
    logger.warn('Vercel Blob not available, using file system fallback');
  }
}

/**
 * Storage service that abstracts file system vs Blob storage
 * Uses Vercel Blob on production, local files in development
 */
class StorageService {
  constructor() {
    this.useBlob = blobModule !== null && process.env.BLOB_READ_WRITE_TOKEN !== undefined;
    this.dataDir = config.dataDir;

    if (!this.useBlob) {
      // Ensure local directory exists
      this.ensureLocalDir();
    }

    logger.info(`Storage mode: ${this.useBlob ? 'Vercel Blob' : 'Local File System'}`);
  }

  /**
   * Ensure local directory exists (for development)
   */
  ensureLocalDir() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (error) {
      logger.warn(`Could not create data directory: ${error.message}`);
    }
  }

  /**
   * Save player data
   */
  async savePlayerData(playerId, data) {
    const filename = `player_${playerId}.json`;
    const content = JSON.stringify(data, null, 2);

    if (this.useBlob) {
      // Use Vercel Blob
      try {
        const blob = await blobModule.put(filename, content, {
          access: 'public',
          contentType: 'application/json',
        });
        logger.success(`Data saved to Blob: ${filename}`);
        return blob.url;
      } catch (error) {
        logger.error(`Error saving to Blob: ${error.message}`);
        throw error;
      }
    } else {
      // Use local file system
      this.ensureLocalDir();
      const filepath = path.join(this.dataDir, filename);
      try {
        fs.writeFileSync(filepath, content);
        logger.success(`Data saved to file: ${filepath}`);
        return filepath;
      } catch (error) {
        logger.error(`Error saving file: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Load player data by ID
   */
  async loadPlayerData(playerId) {
    const filename = `player_${playerId}.json`;

    if (this.useBlob) {
      // Use Vercel Blob
      try {
        const { url } = await blobModule.head(filename);
        const response = await fetch(url);
        if (!response.ok) {
          return null;
        }
        const data = await response.json();
        logger.debug(`Loaded data from Blob: ${filename}`);
        return data;
      } catch (error) {
        logger.debug(`Player data not found in Blob: ${filename}`);
        return null;
      }
    } else {
      // Use local file system
      const filepath = path.join(this.dataDir, filename);
      if (!fs.existsSync(filepath)) {
        return null;
      }
      try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        logger.debug(`Loaded data from file: ${filepath}`);
        return data;
      } catch (error) {
        logger.error(`Error reading file: ${error.message}`);
        return null;
      }
    }
  }

  /**
   * Load player data by name (searches all files)
   */
  async loadPlayerDataByName(playerName) {
    const nameLower = playerName.toLowerCase();

    if (this.useBlob) {
      // List all blobs and search
      try {
        const { blobs } = await blobModule.list({
          prefix: 'player_',
        });

        for (const blob of blobs) {
          const response = await fetch(blob.url);
          const data = await response.json();
          if (data.player && data.player.name.toLowerCase().includes(nameLower)) {
            logger.debug(`Found player in Blob: ${blob.pathname}`);
            return data;
          }
        }
        return null;
      } catch (error) {
        logger.error(`Error searching Blob: ${error.message}`);
        return null;
      }
    } else {
      // Search local files
      if (!fs.existsSync(this.dataDir)) {
        return null;
      }

      const files = fs.readdirSync(this.dataDir).filter(f => f.startsWith('player_'));
      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(this.dataDir, file), 'utf8'));
        if (data.player && data.player.name.toLowerCase().includes(nameLower)) {
          logger.debug(`Found player in file: ${file}`);
          return data;
        }
      }
      return null;
    }
  }

  /**
   * List all players
   */
  async listAllPlayers() {
    if (this.useBlob) {
      // List from Blob
      try {
        const { blobs } = await blobModule.list({
          prefix: 'player_',
        });

        const players = [];
        for (const blob of blobs) {
          try {
            const response = await fetch(blob.url);
            const data = await response.json();
            players.push({
              id: data.player.id,
              name: data.player.name,
              data: data,
              url: blob.url,
            });
          } catch (error) {
            logger.warn(`Error loading blob ${blob.pathname}: ${error.message}`);
          }
        }
        return players;
      } catch (error) {
        logger.error(`Error listing blobs: ${error.message}`);
        return [];
      }
    } else {
      // List from local files
      if (!fs.existsSync(this.dataDir)) {
        return [];
      }

      const files = fs.readdirSync(this.dataDir).filter(f => f.startsWith('player_') && f.endsWith('.json'));
      const players = files.map(file => {
        const data = JSON.parse(fs.readFileSync(path.join(this.dataDir, file), 'utf8'));
        return {
          id: data.player.id,
          name: data.player.name,
          data: data,
          file: file,
        };
      });
      return players;
    }
  }

  /**
   * Delete player data
   */
  async deletePlayerData(playerId) {
    const filename = `player_${playerId}.json`;

    if (this.useBlob) {
      // Delete from Blob
      try {
        await blobModule.del(filename);
        logger.info(`Deleted from Blob: ${filename}`);
        return true;
      } catch (error) {
        logger.error(`Error deleting from Blob: ${error.message}`);
        return false;
      }
    } else {
      // Delete local file
      const filepath = path.join(this.dataDir, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        logger.info(`Deleted file: ${filepath}`);
        return true;
      }
      return false;
    }
  }

  /**
   * Check if storage is available
   */
  isAvailable() {
    if (this.useBlob) {
      return blobModule !== null && process.env.BLOB_READ_WRITE_TOKEN !== undefined;
    }
    return fs.existsSync(this.dataDir) || true; // Can create if doesn't exist
  }
}

export default new StorageService();
