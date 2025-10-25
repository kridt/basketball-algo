import { STAT_TYPES } from '../config/constants.js';

export const validatePredictionInput = (body) => {
  const errors = [];
  const { playerName, statType, line } = body;

  if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
    errors.push({ field: 'playerName', message: 'Player name is required and must be a non-empty string' });
  }

  if (!statType || typeof statType !== 'string') {
    errors.push({ field: 'statType', message: 'Stat type is required' });
  } else if (!Object.values(STAT_TYPES).includes(statType.toLowerCase())) {
    errors.push({
      field: 'statType',
      message: `Stat type must be one of: ${Object.values(STAT_TYPES).join(', ')}`,
    });
  }

  if (line === undefined || line === null) {
    errors.push({ field: 'line', message: 'Line is required' });
  } else {
    const numLine = parseFloat(line);
    if (isNaN(numLine) || numLine < 0) {
      errors.push({ field: 'line', message: 'Line must be a positive number' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateCollectionInput = (body) => {
  const errors = [];
  const { playerName, teamName } = body;

  if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
    errors.push({ field: 'playerName', message: 'Player name is required and must be a non-empty string' });
  }

  if (!teamName || typeof teamName !== 'string' || teamName.trim().length === 0) {
    errors.push({ field: 'teamName', message: 'Team name is required and must be a non-empty string' });
  }

  const { seasons } = body;
  if (seasons !== undefined && seasons !== null) {
    if (!Array.isArray(seasons)) {
      errors.push({ field: 'seasons', message: 'Seasons must be an array' });
    } else if (seasons.some(s => typeof s !== 'string')) {
      errors.push({ field: 'seasons', message: 'All seasons must be strings' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateEdgeInput = (body) => {
  const errors = [];
  const validation = validatePredictionInput(body);

  if (!validation.isValid) {
    errors.push(...validation.errors);
  }

  const { bookmakerOdds } = body;
  if (bookmakerOdds === undefined || bookmakerOdds === null) {
    errors.push({ field: 'bookmakerOdds', message: 'Bookmaker odds is required' });
  } else {
    const odds = parseInt(bookmakerOdds);
    if (isNaN(odds)) {
      errors.push({ field: 'bookmakerOdds', message: 'Bookmaker odds must be a valid integer' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const sanitizePlayerName = (name) => {
  if (!name) return '';
  return name.trim().replace(/[^a-zA-Z\s\-']/g, '');
};

export const sanitizeTeamName = (name) => {
  if (!name) return '';
  return name.trim().replace(/[^a-zA-Z\s\-'0-9]/g, '');
};
