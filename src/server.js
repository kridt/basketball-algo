import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Request logging
app.use(requestLogger);

// API Routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server (only in development/local, not on Vercel)
const startServer = () => {
  app.listen(config.port, () => {
    logger.info(`🏀 Basketball Probability Algorithm`);
    logger.info(`🌐 Server running at http://localhost:${config.port}`);
    logger.info(`📊 API available at http://localhost:${config.port}/api`);
    logger.info(`📝 Environment: ${config.nodeEnv}`);
  });
};

// Only start if running locally (not on Vercel serverless)
// Cross-platform check for main module
const isMainModule = () => {
  try {
    const argPath = process.argv[1].replace(/\\/g, '/');
    const metaPath = fileURLToPath(import.meta.url).replace(/\\/g, '/');
    return metaPath.endsWith(argPath.split('/').pop());
  } catch {
    return false;
  }
};

if (isMainModule() && !process.env.VERCEL) {
  startServer();
}

export default app;
