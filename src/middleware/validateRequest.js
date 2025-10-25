import { sendValidationError } from '../utils/response.js';

export const validate = (validator) => {
  return (req, res, next) => {
    const { isValid, errors } = validator(req.body);

    if (!isValid) {
      return sendValidationError(res, errors);
    }

    next();
  };
};
