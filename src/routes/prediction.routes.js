import express from 'express';
import * as predictionController from '../controllers/prediction.controller.js';
import { validate } from '../middleware/validateRequest.js';
import { validatePredictionInput, validateEdgeInput } from '../utils/validators.js';

const router = express.Router();

// POST /api/predict - Calculate probability for a single prop
router.post('/predict', validate(validatePredictionInput), predictionController.predict);

// POST /api/analyze - Analyze multiple props for a player
router.post('/analyze', predictionController.analyze);

// POST /api/predict-with-odds - Calculate probability with EV based on bookmaker odds
router.post('/predict-with-odds', validate(validatePredictionInput), predictionController.predictWithOdds);

// POST /api/edge - Calculate edge vs bookmaker odds
router.post('/edge', validate(validateEdgeInput), predictionController.calculateEdge);

export default router;
