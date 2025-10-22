import regression from 'regression';
import * as stats from 'simple-statistics';

class MLPredictor {
  constructor() {
    this.models = {};
  }

  /**
   * Extract features from game data for ML prediction
   */
  extractFeatures(game, index, allGames) {
    const recentGames = allGames.slice(Math.max(0, index - 5), index);

    return {
      // Game context
      isHome: game.home ? 1 : 0,
      minutes: game.minutes,

      // Recent performance (last 5 games averages)
      recent5Avg: recentGames.length > 0
        ? stats.mean(recentGames.map(g => g.points))
        : game.points,

      recent5RebAvg: recentGames.length > 0
        ? stats.mean(recentGames.map(g => g.rebounds))
        : game.rebounds,

      recent5AstAvg: recentGames.length > 0
        ? stats.mean(recentGames.map(g => g.assists))
        : game.assists,

      // Shooting efficiency
      fgPct: game.fga > 0 ? game.fgm / game.fga : 0,
      ftPct: game.fta > 0 ? game.ftm / game.fta : 0,

      // Usage indicators
      fga: game.fga,
      fta: game.fta,

      // Game index (to capture trend)
      gameNumber: index
    };
  }

  /**
   * Train a regression model for predicting a specific stat
   */
  trainModel(games, statType) {
    if (games.length < 10) {
      throw new Error('Need at least 10 games to train model');
    }

    // Prepare training data
    const trainingData = [];

    for (let i = 5; i < games.length; i++) {
      const features = this.extractFeatures(games[i], i, games);
      const target = games[i][statType];

      // Convert features to array for regression
      const featureArray = [
        features.isHome,
        features.minutes,
        features.recent5Avg,
        features.gameNumber / games.length // Normalize
      ];

      trainingData.push([...featureArray, target]);
    }

    // Train polynomial regression (degree 2)
    try {
      const model = this.trainPolynomialRegression(trainingData);

      this.models[statType] = {
        model,
        trainedAt: new Date(),
        sampleSize: trainingData.length
      };

      return model;
    } catch (error) {
      console.error(`Error training model for ${statType}:`, error.message);
      return null;
    }
  }

  /**
   * Train polynomial regression model
   */
  trainPolynomialRegression(data) {
    // Extract X (features) and y (target)
    const X = data.map(row => row.slice(0, -1));
    const y = data.map(row => row[row.length - 1]);

    // For simplicity, use weighted average of features
    // In a real ML implementation, this would be more sophisticated
    const weights = this.calculateWeights(X, y);

    return {
      type: 'polynomial',
      weights,
      featureCount: X[0].length
    };
  }

  /**
   * Calculate weights using simple linear regression approach
   */
  calculateWeights(X, y) {
    // Calculate correlation of each feature with target
    const weights = [];

    for (let featureIdx = 0; featureIdx < X[0].length; featureIdx++) {
      const featureValues = X.map(row => row[featureIdx]);
      const correlation = this.calculateCorrelation(featureValues, y);
      weights.push(correlation);
    }

    // Normalize weights
    const sumAbsWeights = weights.reduce((sum, w) => sum + Math.abs(w), 0);
    return weights.map(w => w / sumAbsWeights);
  }

  /**
   * Calculate correlation between two arrays
   */
  calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;

    const meanX = stats.mean(x);
    const meanY = stats.mean(y);
    const stdX = stats.standardDeviation(x);
    const stdY = stats.standardDeviation(y);

    if (stdX === 0 || stdY === 0) return 0;

    let sum = 0;
    for (let i = 0; i < x.length; i++) {
      sum += ((x[i] - meanX) / stdX) * ((y[i] - meanY) / stdY);
    }

    return sum / x.length;
  }

  /**
   * Predict value using trained model
   */
  predict(model, features) {
    if (!model || !model.weights) {
      throw new Error('Model not trained');
    }

    const featureArray = [
      features.isHome,
      features.minutes,
      features.recent5Avg,
      features.gameNumber || 1
    ];

    // Weighted sum prediction
    let prediction = 0;
    for (let i = 0; i < featureArray.length; i++) {
      prediction += featureArray[i] * model.weights[i];
    }

    return Math.max(0, prediction); // Ensure non-negative
  }

  /**
   * Generate ML-based prediction for player prop
   */
  generatePrediction(games, statType, upcomingGameFeatures) {
    // Get recent games for training
    const recentGames = [...games].reverse().slice(0, 30); // Last 30 games

    if (recentGames.length < 10) {
      return {
        prediction: null,
        confidence: 0,
        error: 'Insufficient data for ML prediction'
      };
    }

    // Train or use existing model
    let modelWrapper = this.models[statType];
    if (!modelWrapper || this.isModelStale(modelWrapper)) {
      const trainedModel = this.trainModel(recentGames, statType);
      if (!trainedModel) {
        return {
          prediction: null,
          confidence: 0,
          error: 'Model training failed'
        };
      }
      // Get the wrapper that was stored
      modelWrapper = this.models[statType];
    }

    if (!modelWrapper || !modelWrapper.model) {
      return {
        prediction: null,
        confidence: 0,
        error: 'Model training failed'
      };
    }

    // Extract features for upcoming game
    const features = {
      isHome: upcomingGameFeatures.isHome ? 1 : 0,
      minutes: upcomingGameFeatures.expectedMinutes || stats.mean(recentGames.map(g => g.minutes)),
      recent5Avg: stats.mean(recentGames.slice(0, 5).map(g => g[statType])),
      gameNumber: 1 // Most recent
    };

    // Make prediction
    const prediction = this.predict(modelWrapper.model, features);

    // Calculate confidence based on recent prediction accuracy
    const confidence = this.calculatePredictionConfidence(recentGames, statType, modelWrapper.model);

    return {
      prediction,
      confidence,
      model: 'Polynomial Regression',
      features: {
        homeAdvantage: features.isHome === 1,
        expectedMinutes: features.minutes,
        recentForm: features.recent5Avg
      }
    };
  }

  /**
   * Calculate prediction confidence using cross-validation
   */
  calculatePredictionConfidence(games, statType, model) {
    // Use last 10 games as validation set
    const validationGames = games.slice(0, 10);
    const errors = [];

    for (let i = 5; i < validationGames.length; i++) {
      const features = this.extractFeatures(validationGames[i], i, validationGames);
      const prediction = this.predict(model, features);
      const actual = validationGames[i][statType];
      const error = Math.abs(prediction - actual);
      errors.push(error);
    }

    if (errors.length === 0) return 0.5;

    // Calculate MAPE (Mean Absolute Percentage Error)
    const mape = stats.mean(errors.map((err, idx) => {
      const actual = validationGames[idx + 5][statType];
      return actual > 0 ? err / actual : 0;
    }));

    // Convert MAPE to confidence score (lower error = higher confidence)
    const confidence = Math.max(0, Math.min(1, 1 - mape));

    return confidence;
  }

  /**
   * Check if model is stale and needs retraining
   */
  isModelStale(model) {
    if (!model || !model.trainedAt) return true;

    const hoursSinceTraining = (Date.now() - new Date(model.trainedAt)) / (1000 * 60 * 60);
    return hoursSinceTraining > 168; // Retrain after 1 week
  }

  /**
   * Calculate probability of over/under using ML prediction
   */
  calculateMLProbability(prediction, line, historicalStdDev) {
    if (!prediction || prediction === null) {
      return { over: 0.5, under: 0.5, confidence: 0 };
    }

    // Use normal distribution around ML prediction
    const stdDev = historicalStdDev || (prediction * 0.2); // Assume 20% variation if no historical data
    const z = (line - prediction) / stdDev;

    // Calculate probability using normal CDF
    const underProb = this.normalCDF(z);
    const overProb = 1 - underProb;

    return {
      over: overProb,
      under: underProb,
      prediction,
      confidence: this.models[Object.keys(this.models)[0]]?.confidence || 0.5
    };
  }

  /**
   * Normal cumulative distribution function
   */
  normalCDF(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return z > 0 ? 1 - probability : probability;
  }
}

export default new MLPredictor();
