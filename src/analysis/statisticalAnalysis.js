import * as stats from 'simple-statistics';

class StatisticalAnalysis {
  constructor() {
    this.recentGamesWeight = parseFloat(process.env.RECENT_GAMES_WEIGHT || '0.6');
  }

  /**
   * Calculate comprehensive statistics for a stat type
   */
  calculateStats(games, statType) {
    const values = games.map(g => g[statType]).filter(v => v !== null && v !== undefined);

    if (values.length === 0) {
      return null;
    }

    return {
      mean: stats.mean(values),
      median: stats.median(values),
      mode: this.calculateMode(values),
      stdDev: stats.standardDeviation(values),
      variance: stats.variance(values),
      min: stats.min(values),
      max: stats.max(values),
      q1: stats.quantile(values, 0.25),
      q3: stats.quantile(values, 0.75),
      sampleSize: values.length
    };
  }

  /**
   * Calculate mode (most frequent value)
   */
  calculateMode(values) {
    const frequency = {};
    let maxFreq = 0;
    let mode = values[0];

    values.forEach(val => {
      frequency[val] = (frequency[val] || 0) + 1;
      if (frequency[val] > maxFreq) {
        maxFreq = frequency[val];
        mode = val;
      }
    });

    return mode;
  }

  /**
   * Calculate weighted average (recent games weighted more heavily)
   */
  calculateWeightedAverage(games, statType) {
    if (games.length === 0) return 0;

    const recentCount = Math.min(10, Math.floor(games.length * 0.3));
    const recentGames = games.slice(0, recentCount);
    const olderGames = games.slice(recentCount);

    const recentAvg = recentGames.length > 0
      ? stats.mean(recentGames.map(g => g[statType]))
      : 0;

    const olderAvg = olderGames.length > 0
      ? stats.mean(olderGames.map(g => g[statType]))
      : recentAvg;

    return (recentAvg * this.recentGamesWeight) + (olderAvg * (1 - this.recentGamesWeight));
  }

  /**
   * Calculate trend (linear regression slope)
   */
  calculateTrend(games, statType) {
    if (games.length < 3) return { slope: 0, direction: 'stable' };

    // Reverse to get chronological order
    const chronological = [...games].reverse();
    const data = chronological.map((g, idx) => [idx, g[statType]]);

    const regression = stats.linearRegression(data);
    const slope = regression.m;

    let direction = 'stable';
    if (slope > 0.5) direction = 'increasing';
    else if (slope < -0.5) direction = 'decreasing';

    return {
      slope,
      direction,
      rSquared: stats.rSquared(data, stats.linearRegressionLine(regression))
    };
  }

  /**
   * Calculate probability using normal distribution
   */
  calculateNormalProbability(value, mean, stdDev) {
    if (stdDev === 0) {
      return value < mean ? 0 : (value > mean ? 1 : 0.5);
    }

    const z = (value - mean) / stdDev;
    return this.normalCDF(z);
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

  /**
   * Calculate probability of achieving over/under using historical data
   */
  calculateOverUnderProbability(games, statType, line) {
    const values = games.map(g => g[statType]);
    const overCount = values.filter(v => v > line).length;
    const underCount = values.filter(v => v < line).length;
    const pushCount = values.filter(v => v === line).length;

    return {
      overProbability: overCount / values.length,
      underProbability: underCount / values.length,
      pushProbability: pushCount / values.length,
      historicalOver: overCount,
      historicalUnder: underCount,
      historicalPush: pushCount,
      totalGames: values.length
    };
  }

  /**
   * Adjust probability based on factors (home/away, opponent, minutes, etc.)
   */
  adjustProbabilityForFactors(baseProbability, factors) {
    let adjustedProb = baseProbability;
    let adjustments = [];

    // Home/Away adjustment
    if (factors.isHome !== undefined) {
      const homeAdj = factors.homeAwayImpact || 0;
      if (factors.isHome && homeAdj > 0) {
        adjustedProb += homeAdj;
        adjustments.push({ factor: 'Home Court', impact: `+${(homeAdj * 100).toFixed(1)}%` });
      } else if (!factors.isHome && homeAdj > 0) {
        adjustedProb -= homeAdj * 0.7;
        adjustments.push({ factor: 'Away Game', impact: `-${(homeAdj * 0.7 * 100).toFixed(1)}%` });
      }
    }

    // Recent trend adjustment
    if (factors.trendDirection) {
      if (factors.trendDirection === 'increasing') {
        adjustedProb += 0.05;
        adjustments.push({ factor: 'Upward Trend', impact: '+5.0%' });
      } else if (factors.trendDirection === 'decreasing') {
        adjustedProb -= 0.05;
        adjustments.push({ factor: 'Downward Trend', impact: '-5.0%' });
      }
    }

    // Minutes played adjustment
    if (factors.expectedMinutes && factors.avgMinutes) {
      const minutesDiff = factors.expectedMinutes - factors.avgMinutes;
      const minutesImpact = (minutesDiff / factors.avgMinutes) * 0.1;
      adjustedProb += minutesImpact;
      if (Math.abs(minutesImpact) > 0.01) {
        adjustments.push({
          factor: 'Playing Time',
          impact: `${minutesImpact >= 0 ? '+' : ''}${(minutesImpact * 100).toFixed(1)}%`
        });
      }
    }

    // Opponent defense adjustment (placeholder for future implementation)
    if (factors.opponentDefenseRating) {
      // This would be calculated based on opponent's defensive statistics
      // For now, it's a placeholder
    }

    // Ensure probability stays within bounds
    adjustedProb = Math.max(0, Math.min(1, adjustedProb));

    return {
      adjustedProbability: adjustedProb,
      adjustments
    };
  }

  /**
   * Calculate home/away split impact
   */
  calculateHomeAwaySplit(games, statType) {
    const homeGames = games.filter(g => g.home);
    const awayGames = games.filter(g => !g.home);

    if (homeGames.length === 0 || awayGames.length === 0) {
      return { impact: 0, homeAvg: 0, awayAvg: 0 };
    }

    const homeStats = this.calculateStats(homeGames, statType);
    const awayStats = this.calculateStats(awayGames, statType);

    const impact = (homeStats.mean - awayStats.mean) / homeStats.mean;

    return {
      impact: Math.max(0, impact), // Positive impact for home games
      homeAvg: homeStats.mean,
      awayAvg: awayStats.mean,
      homeGames: homeGames.length,
      awayGames: awayGames.length
    };
  }

  /**
   * Calculate consistency score (lower stdDev = more consistent)
   */
  calculateConsistencyScore(games, statType) {
    const gameStats = this.calculateStats(games, statType);
    if (!gameStats) return 0;

    // Coefficient of variation (CV) - lower is more consistent
    const cv = gameStats.stdDev / gameStats.mean;

    // Convert to 0-1 scale where 1 is most consistent
    // Typical CV for NBA stats ranges from 0.2 to 0.6
    const consistencyScore = Math.max(0, Math.min(1, 1 - cv));

    return consistencyScore;
  }

  /**
   * Calculate confidence level based on sample size and consistency
   */
  calculateConfidence(sampleSize, consistency) {
    // More games and higher consistency = higher confidence
    const sizeConfidence = Math.min(sampleSize / 50, 1); // Cap at 50 games
    const overallConfidence = (sizeConfidence * 0.4) + (consistency * 0.6);

    return {
      confidence: overallConfidence,
      level: this.getConfidenceLevel(overallConfidence),
      factors: {
        sampleSize: sampleSize,
        consistency: consistency
      }
    };
  }

  /**
   * Get confidence level label
   */
  getConfidenceLevel(confidence) {
    if (confidence >= 0.8) return 'Very High';
    if (confidence >= 0.65) return 'High';
    if (confidence >= 0.5) return 'Moderate';
    if (confidence >= 0.35) return 'Low';
    return 'Very Low';
  }

  /**
   * Generate comprehensive analysis for a player prop
   */
  analyzePlayerProp(games, statType, line, factors = {}) {
    // Calculate basic statistics
    const basicStats = this.calculateStats(games, statType);
    if (!basicStats) {
      return { error: 'Insufficient data for analysis' };
    }

    // Calculate weighted average (recent games weighted more)
    const weightedAvg = this.calculateWeightedAverage(games, statType);

    // Calculate trend
    const trend = this.calculateTrend(games, statType);

    // Calculate historical over/under
    const historical = this.calculateOverUnderProbability(games, statType, line);

    // Calculate normal distribution probability
    const normalProb = this.calculateNormalProbability(line, basicStats.mean, basicStats.stdDev);

    // Base probability (combine historical and normal distribution)
    const baseProbability = (historical.overProbability * 0.6) + ((1 - normalProb) * 0.4);

    // Calculate home/away impact
    const homeAwaySplit = this.calculateHomeAwaySplit(games, statType);

    // Adjust for factors
    const adjustmentFactors = {
      ...factors,
      trendDirection: trend.direction,
      homeAwayImpact: homeAwaySplit.impact,
      avgMinutes: this.calculateStats(games, 'minutes')?.mean
    };

    const { adjustedProbability, adjustments } = this.adjustProbabilityForFactors(
      baseProbability,
      adjustmentFactors
    );

    // Calculate consistency and confidence
    const consistency = this.calculateConsistencyScore(games, statType);
    const confidence = this.calculateConfidence(games.length, consistency);

    return {
      line,
      statType,
      probability: {
        over: adjustedProbability,
        under: 1 - adjustedProbability,
        base: baseProbability
      },
      statistics: {
        mean: basicStats.mean,
        median: basicStats.median,
        weightedAvg,
        stdDev: basicStats.stdDev,
        min: basicStats.min,
        max: basicStats.max,
        q1: basicStats.q1,
        q3: basicStats.q3
      },
      historical: {
        overCount: historical.historicalOver,
        underCount: historical.historicalUnder,
        pushCount: historical.historicalPush,
        overRate: historical.overProbability,
        totalGames: historical.totalGames
      },
      trend: {
        direction: trend.direction,
        slope: trend.slope,
        strength: trend.rSquared
      },
      splits: {
        home: homeAwaySplit.homeAvg,
        away: homeAwaySplit.awayAvg,
        impact: homeAwaySplit.impact
      },
      confidence: {
        score: confidence.confidence,
        level: confidence.level,
        consistency
      },
      adjustments
    };
  }
}

export default new StatisticalAnalysis();
