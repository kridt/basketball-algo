import probabilityCalculator from '../models/probabilityCalculator.js';
import oddsApiService from '../services/oddsApiService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { HTTP_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';

export const predict = async (req, res, next) => {
  try {
    const { playerName, statType, line, gameContext } = req.body;

    const result = await probabilityCalculator.calculateProbability(
      playerName,
      statType,
      parseFloat(line),
      gameContext || {}
    );

    if (result.error) {
      return sendError(res, result.error, HTTP_STATUS.BAD_REQUEST, result.message);
    }

    return sendSuccess(res, result);
  } catch (error) {
    logger.error('Prediction error:', error);
    next(error);
  }
};

export const analyze = async (req, res, next) => {
  try {
    const { playerName, lines, gameContext } = req.body;

    const results = await probabilityCalculator.calculateAllProps(
      playerName,
      lines,
      gameContext || {}
    );

    return sendSuccess(res, results);
  } catch (error) {
    logger.error('Analysis error:', error);
    next(error);
  }
};

export const predictWithOdds = async (req, res, next) => {
  try {
    const { playerName, statType, line, gameContext, eventId } = req.body;

    // Get basic prediction
    const prediction = await probabilityCalculator.calculateProbability(
      playerName,
      statType,
      parseFloat(line),
      gameContext || {}
    );

    // If eventId provided, fetch odds and calculate EV
    if (eventId && !prediction.error) {
      logger.info(`Fetching odds for event ${eventId}, player: ${playerName}, stat: ${statType}`);
      const oddsData = await oddsApiService.getEventOdds(eventId);

      if (oddsData) {
        logger.debug(`Odds data received for event ${eventId}`);
        const playerProps = oddsApiService.findPlayerPropsAllBookmakers(oddsData, playerName, statType);

        if (playerProps) {
          logger.info(`Found player props for ${playerName} ${statType} from ${Object.keys(playerProps).length} bookmakers`);

          const ourOverProb = prediction.probability.rawOver;
          const ourUnderProb = prediction.probability.rawUnder;

          // Process odds from each bookmaker
          const bookmakerOdds = {};
          let bestOverEV = -Infinity;
          let bestUnderEV = -Infinity;
          let bestBookmakerOver = null;
          let bestBookmakerUnder = null;

          for (const [bookmakerName, prop] of Object.entries(playerProps)) {
            const impliedOverProb = oddsApiService.calculateImpliedProbability(prop.overOdds);
            const impliedUnderProb = oddsApiService.calculateImpliedProbability(prop.underOdds);
            const overEV = oddsApiService.calculateEV(ourOverProb, prop.overOdds);
            const underEV = oddsApiService.calculateEV(ourUnderProb, prop.underOdds);

            logger.debug(`${bookmakerName} - Over EV: ${(overEV * 100).toFixed(2)}%, Under EV: ${(underEV * 100).toFixed(2)}%`);

            bookmakerOdds[bookmakerName] = {
              line: prop.line,
              overOdds: prop.overOdds,
              underOdds: prop.underOdds,
              impliedOverProb: (impliedOverProb * 100).toFixed(2) + '%',
              impliedUnderProb: (impliedUnderProb * 100).toFixed(2) + '%',
              overEV: (overEV * 100).toFixed(2) + '%',
              underEV: (underEV * 100).toFixed(2) + '%',
              overEVRaw: overEV,
              underEVRaw: underEV,
              marketName: prop.marketName,
              updatedAt: prop.updatedAt,
            };

            if (overEV > bestOverEV) {
              bestOverEV = overEV;
              bestBookmakerOver = bookmakerName;
            }
            if (underEV > bestUnderEV) {
              bestUnderEV = underEV;
              bestBookmakerUnder = bookmakerName;
            }
          }

          // Determine overall recommendation
          let recommendation = 'NO VALUE';
          let bestBet = null;
          let bestBookmaker = null;

          if (bestOverEV > 0.05 && bestOverEV > bestUnderEV) {
            recommendation = 'OVER';
            bestBet = 'OVER';
            bestBookmaker = bestBookmakerOver;
          } else if (bestUnderEV > 0.05) {
            recommendation = 'UNDER';
            bestBet = 'UNDER';
            bestBookmaker = bestBookmakerUnder;
          }

          prediction.odds = {
            available: true,
            bookmakers: bookmakerOdds,
            bestValue: {
              bet: bestBet,
              bookmaker: bestBookmaker,
              ev: bestBet === 'OVER' ? (bestOverEV * 100).toFixed(2) + '%' : (bestUnderEV * 100).toFixed(2) + '%',
              evRaw: bestBet === 'OVER' ? bestOverEV : bestUnderEV,
            },
            recommendation,
          };
        } else {
          logger.warn(`Player ${playerName} not found in odds for ${statType}`);
          prediction.odds = {
            available: false,
            message: 'Player not found in odds',
          };
        }
      } else {
        logger.warn(`No odds data returned for event ${eventId}`);
        prediction.odds = {
          available: false,
          message: 'Odds not available for this event',
        };
      }
    } else {
      prediction.odds = {
        available: false,
        message: 'No event ID provided',
      };
    }

    return sendSuccess(res, prediction);
  } catch (error) {
    logger.error('Prediction with odds error:', error);
    next(error);
  }
};

export const calculateEdge = async (req, res, next) => {
  try {
    const { playerName, statType, line, bookmakerOdds, gameContext } = req.body;

    // Get probability
    const result = await probabilityCalculator.calculateProbability(
      playerName,
      statType,
      parseFloat(line),
      gameContext || {}
    );

    if (result.error) {
      return sendError(res, result.error, HTTP_STATUS.BAD_REQUEST);
    }

    // Calculate edge
    const edge = probabilityCalculator.calculateEdge(
      result.probability.rawOver,
      parseInt(bookmakerOdds)
    );

    return sendSuccess(res, {
      ...result,
      edge,
    });
  } catch (error) {
    logger.error('Edge calculation error:', error);
    next(error);
  }
};
