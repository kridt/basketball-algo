import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // API Keys
  apiSportsKey: process.env.API_SPORTS_KEY,
  oddsApiKey: process.env.ODDS_API_KEY,

  // API URLs
  apiSportsBaseUrl: process.env.API_SPORTS_BASE_URL || 'https://v1.basketball.api-sports.io',
  oddsApiBaseUrl: process.env.ODDS_API_BASE_URL || 'https://api.odds-api.io',

  // Cache
  cacheExpiryHours: parseInt(process.env.CACHE_EXPIRY_HOURS || '24', 10),

  // Analysis
  recentGamesWeight: parseFloat(process.env.RECENT_GAMES_WEIGHT || '0.6'),
  minGamesForPrediction: parseInt(process.env.MIN_GAMES_FOR_PREDICTION || '10', 10),

  // Paths - use /tmp on Vercel (serverless), local paths otherwise
  dataDir: process.env.VERCEL ? '/tmp/data' : path.join(process.cwd(), 'data'),
  cacheDir: process.env.VERCEL ? '/tmp/cache' : path.join(process.cwd(), 'data', 'cache'),
  publicDir: path.join(process.cwd(), 'public'),

  // Feature flags
  enableCaching: process.env.ENABLE_CACHING !== 'false',
  enableLogging: process.env.ENABLE_LOGGING !== 'false',
};

// Validation
if (!config.apiSportsKey) {
  console.warn('⚠️  API_SPORTS_KEY not found in environment variables');
}

if (!config.oddsApiKey) {
  console.warn('⚠️  ODDS_API_KEY not found in environment variables');
}

export default config;
