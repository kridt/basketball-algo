import statisticalAnalysis from '../analysis/statisticalAnalysis.js';
import mlPredictor from '../analysis/mlPredictor.js';
import dataCollector from '../services/dataCollector.js';

class ProbabilityCalculator {
  constructor() {
    this.statTypes = ['points', 'rebounds', 'assists', 'pra'];
  }

  /**
   * Calculate comprehensive probability for a player prop
   */
  async calculateProbability(playerName, propType, line, gameContext = {}) {
    console.log(`\nCalculating probability for ${playerName} ${propType} ${line}...`);

    // Load or collect player data
    let playerData = await dataCollector.loadPlayerDataByName(playerName);

    if (!playerData) {
      console.log('Player data not found locally. Collecting from API...');
      playerData = await dataCollector.collectPlayerData(playerName);
    }

    // Get relevant games
    const allGames = dataCollector.getAllGames(playerData);

    if (allGames.length < 10) {
      return {
        error: 'Insufficient game data',
        message: `Only ${allGames.length} games found. Need at least 10 games for reliable predictions.`
      };
    }

    // Filter games based on minimum minutes threshold
    const minMinutes = 15; // Only consider games where player played significant minutes
    const qualifyingGames = dataCollector.filterGames(allGames, {
      minMinutes
    });

    console.log(`Analyzing ${qualifyingGames.length} games (filtered by ${minMinutes}+ minutes)...`);

    // Get statistical analysis
    const statAnalysis = statisticalAnalysis.analyzePlayerProp(
      qualifyingGames,
      propType,
      line,
      {
        isHome: gameContext.isHome,
        expectedMinutes: gameContext.expectedMinutes
      }
    );

    // Get ML prediction
    const mlPrediction = mlPredictor.generatePrediction(
      qualifyingGames,
      propType,
      {
        isHome: gameContext.isHome,
        expectedMinutes: gameContext.expectedMinutes
      }
    );

    // Combine statistical and ML probabilities (hybrid approach)
    const hybridProbability = this.combineStatisticalAndML(
      statAnalysis?.probability || { over: 50, under: 50 },
      mlPrediction,
      statAnalysis?.statistics?.stdDev || 0
    );

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      hybridProbability,
      statAnalysis.confidence,
      line
    );

    return {
      player: playerData.player.name,
      prop: `${propType.toUpperCase()} ${line}`,
      probability: hybridProbability,
      recommendation,
      projection: statAnalysis?.statistics?.weightedAvg || statAnalysis?.statistics?.mean || 0,
      recentAverage: statAnalysis?.statistics?.mean || 0,
      analysis: {
        statistical: {
          mean: statAnalysis?.statistics?.mean?.toFixed(2) || '0',
          median: statAnalysis?.statistics?.median?.toFixed(2) || '0',
          weightedAvg: statAnalysis?.statistics?.weightedAvg?.toFixed(2) || '0',
          stdDev: statAnalysis?.statistics?.stdDev?.toFixed(2) || '0',
          range: `${statAnalysis?.statistics?.min || 0} - ${statAnalysis?.statistics?.max || 0}`
        },
        historical: {
          overCount: statAnalysis?.historical?.overCount || 0,
          underCount: statAnalysis?.historical?.underCount || 0,
          overRate: ((statAnalysis?.historical?.overRate || 0) * 100).toFixed(1) + '%',
          totalGames: statAnalysis?.historical?.totalGames || 0
        },
        trend: statAnalysis?.trend || 'N/A',
        splits: {
          home: statAnalysis?.splits?.home?.toFixed(2) || '0',
          away: statAnalysis?.splits?.away?.toFixed(2) || '0'
        },
        machineLearning: {
          prediction: mlPrediction?.prediction ? mlPrediction.prediction.toFixed(2) : 'N/A',
          confidence: mlPrediction?.confidence ? (mlPrediction.confidence * 100).toFixed(1) + '%' : 'N/A',
          model: mlPrediction?.model || 'N/A'
        }
      },
      confidence: {
        overall: statAnalysis?.confidence?.level || 'Medium',
        score: ((statAnalysis?.confidence?.score || 50) * 100).toFixed(1) + '%',
        consistency: ((statAnalysis?.confidence?.consistency || 50) * 100).toFixed(1) + '%',
        sampleSize: qualifyingGames.length
      },
      adjustments: statAnalysis.adjustments,
      gameContext: {
        isHome: gameContext.isHome,
        opponent: gameContext.opponent || 'TBD',
        expectedMinutes: gameContext.expectedMinutes
      }
    };
  }

  /**
   * Combine statistical and ML probabilities using weighted average
   */
  combineStatisticalAndML(statProb, mlPrediction, historicalStdDev) {
    // Safety check: ensure probabilities are in valid range [0, 1]
    const clampProb = (prob) => Math.max(0, Math.min(1, prob));

    // If ML prediction is not available or has low confidence, rely more on statistical
    if (!mlPrediction.prediction || mlPrediction.confidence < 0.3) {
      const safeOver = clampProb(statProb.over);
      const safeUnder = clampProb(statProb.under);
      return {
        over: (safeOver * 100).toFixed(2) + '%',
        under: (safeUnder * 100).toFixed(2) + '%',
        method: 'Statistical (ML unavailable)',
        rawOver: safeOver,
        rawUnder: safeUnder
      };
    }

    // Calculate ML probability
    const mlProb = mlPredictor.calculateMLProbability(
      mlPrediction.prediction,
      parseFloat(statProb.base) * 100, // Convert base to line equivalent
      historicalStdDev
    );

    // Weighted combination based on ML confidence
    const mlWeight = mlPrediction.confidence * 0.4; // Max 40% weight for ML
    const statWeight = 1 - mlWeight;

    const hybridOver = clampProb((statProb.over * statWeight) + (mlProb.over * mlWeight));
    const hybridUnder = clampProb((statProb.under * statWeight) + (mlProb.under * mlWeight));

    return {
      over: (hybridOver * 100).toFixed(2) + '%',
      under: (hybridUnder * 100).toFixed(2) + '%',
      method: 'Hybrid (Statistical + ML)',
      weights: {
        statistical: (statWeight * 100).toFixed(1) + '%',
        ml: (mlWeight * 100).toFixed(1) + '%'
      },
      rawOver: hybridOver,
      rawUnder: hybridUnder
    };
  }

  /**
   * Generate recommendation based on probability and confidence
   */
  generateRecommendation(probability, confidence, line) {
    const overProb = parseFloat(probability.rawOver);
    const confidenceScore = confidence?.score || 50;
    const confidenceLevel = confidence?.level || 'Medium';

    let recommendation = {
      bet: null,
      strength: null,
      reasoning: []
    };

    // Determine bet direction
    if (overProb >= 0.60) {
      recommendation.bet = 'OVER';
    } else if (overProb <= 0.40) {
      recommendation.bet = 'UNDER';
    } else {
      recommendation.bet = 'NO BET';
      recommendation.strength = 'N/A';
      recommendation.reasoning.push('Probability too close to 50/50 - no clear edge');
      return recommendation;
    }

    // Determine strength
    const edge = Math.abs(overProb - 0.5);

    if (edge >= 0.20 && confidenceScore >= 0.7) {
      recommendation.strength = 'STRONG';
    } else if (edge >= 0.15 && confidenceScore >= 0.6) {
      recommendation.strength = 'MODERATE';
    } else if (edge >= 0.10 && confidenceScore >= 0.5) {
      recommendation.strength = 'WEAK';
    } else {
      recommendation.bet = 'NO BET';
      recommendation.strength = 'N/A';
      recommendation.reasoning.push('Edge or confidence too low');
      return recommendation;
    }

    // Add reasoning
    if (overProb >= 0.60) {
      recommendation.reasoning.push(`${(overProb * 100).toFixed(1)}% probability of going OVER`);
    } else {
      recommendation.reasoning.push(`${((1 - overProb) * 100).toFixed(1)}% probability of going UNDER`);
    }

    recommendation.reasoning.push(`Confidence: ${confidenceLevel} (${(confidenceScore * 100).toFixed(1)}%)`);

    if (edge >= 0.15) {
      recommendation.reasoning.push(`Strong edge detected (${(edge * 100).toFixed(1)}%)`);
    }

    return recommendation;
  }

  /**
   * Calculate probabilities for all prop types
   */
  async calculateAllProps(playerName, lines, gameContext = {}) {
    const results = {};

    for (const propType of this.statTypes) {
      if (lines[propType]) {
        try {
          results[propType] = await this.calculateProbability(
            playerName,
            propType,
            lines[propType],
            gameContext
          );
        } catch (error) {
          results[propType] = {
            error: error.message
          };
        }
      }
    }

    return results;
  }

  /**
   * Compare probability to bookmaker odds and calculate edge
   */
  calculateEdge(probability, bookmakerOdds) {
    // Convert American odds to implied probability
    let impliedProb;
    if (bookmakerOdds > 0) {
      impliedProb = 100 / (bookmakerOdds + 100);
    } else {
      impliedProb = Math.abs(bookmakerOdds) / (Math.abs(bookmakerOdds) + 100);
    }

    // Calculate edge (our probability - bookmaker's implied probability)
    const edge = probability - impliedProb;
    const edgePercent = (edge * 100).toFixed(2);

    return {
      impliedProbability: (impliedProb * 100).toFixed(2) + '%',
      ourProbability: (probability * 100).toFixed(2) + '%',
      edge: edgePercent + '%',
      hasEdge: edge > 0.05, // 5% edge threshold
      recommendation: edge > 0.05 ? 'BET' : 'NO BET'
    };
  }
}

export default new ProbabilityCalculator();
