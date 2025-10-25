import express from 'express';
import * as oddsController from '../controllers/odds.controller.js';

const router = express.Router();

// GET /api/next-match/:team - Get next match for a team
router.get('/next-match/:team', oddsController.getNextMatch);

// GET /api/value-bets - Find all players with positive EV bets for upcoming games
router.get('/value-bets', oddsController.getValueBets);

export default router;
