import express from 'express';
import predictionRoutes from './prediction.routes.js';
import playerRoutes from './player.routes.js';
import oddsRoutes from './odds.routes.js';
import eplRoutes from './epl.routes.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Mount route modules
router.use(predictionRoutes);
router.use(playerRoutes);
router.use(oddsRoutes);
router.use(eplRoutes);  // EPL value bets routes

export default router;
