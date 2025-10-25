export const API_CONFIG = {
  NBA_LEAGUE_ID: 12,
  DEFAULT_CACHE_EXPIRY_HOURS: 24,
  DEFAULT_MIN_MINUTES: 15,
  MIN_GAMES_FOR_PREDICTION: 10,
  RECENT_GAMES_WEIGHT: 0.6,
};

export const PROBABILITY_THRESHOLDS = {
  STRONG_OVER: 0.60,
  STRONG_UNDER: 0.40,
  STRONG_EDGE: 0.20,
  MODERATE_EDGE: 0.15,
  WEAK_EDGE: 0.10,
  MIN_EDGE: 0.05,
  CONFIDENCE_VERY_HIGH: 0.8,
  CONFIDENCE_HIGH: 0.65,
  CONFIDENCE_MODERATE: 0.5,
  CONFIDENCE_LOW: 0.35,
};

export const BET_STRENGTH = {
  STRONG: 'STRONG',
  MODERATE: 'MODERATE',
  WEAK: 'WEAK',
  NO_BET: 'NO BET',
};

export const STAT_TYPES = {
  POINTS: 'points',
  REBOUNDS: 'rebounds',
  ASSISTS: 'assists',
  PRA: 'pra',
  POINTS_ASSISTS: 'points_assists',
  POINTS_REBOUNDS: 'points_rebounds',
  REBOUNDS_ASSISTS: 'rebounds_assists',
};

export const SEASONS = {
  CURRENT: '2024-2025',
  PREVIOUS: '2023-2024',
  DEFAULT_COLLECTION: ['2023-2024', '2024-2025'],
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

export const ERROR_MESSAGES = {
  PLAYER_NOT_FOUND: 'Player not found',
  TEAM_NOT_FOUND: 'Team not found',
  INSUFFICIENT_DATA: 'Insufficient game data for reliable predictions',
  MISSING_REQUIRED_FIELDS: 'Missing required fields',
  NO_PLAYER_DATA: 'Player data not found. Run /api/collect first.',
};
