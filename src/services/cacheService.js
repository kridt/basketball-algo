import fs from 'fs';
import path from 'path';
import config from '../config/env.js';
import logger from '../utils/logger.js';

class CacheService {
  constructor() {
    this.cacheDir = config.cacheDir;
    this.cacheExpiry = config.cacheExpiryHours * 60 * 60 * 1000;

    // Ensure cache directory exists (safe for serverless)
    this.ensureCacheDir();
  }

  /**
   * Safely ensure cache directory exists
   */
  ensureCacheDir() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch (error) {
      // In serverless environments like Vercel, /tmp may need creation
      logger.warn(`Could not create cache directory: ${error.message}`);
    }
  }

  /**
   * Generate cache key from endpoint and params
   */
  getCacheKey(endpoint, params = {}) {
    const paramStr = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('_');
    return `${endpoint.replace(/\//g, '_')}_${paramStr}`.replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * Get cached data if available and not expired
   */
  get(key) {
    if (!config.enableCaching) return null;

    const cachePath = path.join(this.cacheDir, `${key}.json`);

    if (!fs.existsSync(cachePath)) {
      return null;
    }

    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        logger.debug(`Cache hit: ${key}`);
        return cached.data;
      }

      logger.debug(`Cache expired: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Error reading cache: ${key}`, error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  set(key, data) {
    if (!config.enableCaching) return;

    // Ensure directory exists before writing
    this.ensureCacheDir();

    const cachePath = path.join(this.cacheDir, `${key}.json`);

    try {
      fs.writeFileSync(cachePath, JSON.stringify({
        timestamp: Date.now(),
        data,
      }));
      logger.debug(`Cache set: ${key}`);
    } catch (error) {
      logger.error(`Error writing cache: ${key}`, error);
    }
  }

  /**
   * Clear specific cache entry
   */
  clear(key) {
    const cachePath = path.join(this.cacheDir, `${key}.json`);

    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
      logger.debug(`Cache cleared: ${key}`);
    }
  }

  /**
   * Clear all cache
   */
  clearAll() {
    if (!fs.existsSync(this.cacheDir)) return;

    const files = fs.readdirSync(this.cacheDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(this.cacheDir, file));
    });

    logger.info('All cache cleared');
  }
}

export default new CacheService();
