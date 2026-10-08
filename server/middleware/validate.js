import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';

export const validate = (schemas = {}) => {
  return async (req, res, next) => {
    try {
      if (schemas.params && req.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query && req.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.body && req.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const validateObjectIdParam = (paramName = 'id') => {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !isValidObjectId(value)) {
      return next(new AppError(`Invalid ${paramName} parameter format`, 400));
    }
    next();
  };
};

export default validate;
