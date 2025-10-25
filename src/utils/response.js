import { HTTP_STATUS } from '../config/constants.js';

export const sendSuccess = (res, data, statusCode = HTTP_STATUS.OK) => {
  return res.status(statusCode).json({
    success: true,
    ...data,
  });
};

export const sendError = (res, message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) => {
  const response = {
    success: false,
    error: message,
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

export const sendValidationError = (res, errors) => {
  return res.status(HTTP_STATUS.BAD_REQUEST).json({
    success: false,
    error: 'Validation failed',
    errors,
  });
};

export const sendNotFound = (res, message = 'Resource not found') => {
  return res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: message,
  });
};
