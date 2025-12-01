// EPL Value Bets Routes
import express from 'express';
import { runEvBetFinder, getActiveValueBets } from '../services/epl/evBetFinder.js';

const router = express.Router();

// GET /api/ev-bets - Get active value bets
router.get('/ev-bets', (req, res) => {
  try {
    const { minEV = 0, maxOdds = 10, limit = 100, league } = req.query;

    const result = getActiveValueBets({
      minEV: parseFloat(minEV),
      maxOdds: parseFloat(maxOdds),
      limit: parseInt(limit),
      league
    });

    res.json(result);
  } catch (error) {
    console.error('[EPL Routes] Error getting value bets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ev-bets/refresh - Trigger manual refresh
router.post('/ev-bets/refresh', async (req, res) => {
  try {
    console.log('[EPL Routes] Manual refresh triggered');
    const result = await runEvBetFinder();

    if (result.success) {
      const bets = getActiveValueBets({});
      res.json({
        success: true,
        message: `Found ${result.count} value bets`,
        stats: { valueBetsFound: result.count },
        ...bets
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('[EPL Routes] Error refreshing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
