import express from 'express';
import * as playerController from '../controllers/player.controller.js';
import { validate } from '../middleware/validateRequest.js';
import { validateCollectionInput } from '../utils/validators.js';

const router = express.Router();

// POST /api/collect - Collect player data from API
router.post('/collect', validate(validateCollectionInput), playerController.collect);

// GET /api/players - Get all saved players
router.get('/players', playerController.getAllPlayers);

// GET /api/player/:name - Get cached player data
router.get('/player/:name', playerController.getPlayer);

export default router;
