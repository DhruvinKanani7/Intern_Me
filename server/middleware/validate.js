import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';

export const validate = (schemaOrMap = {}) => {
  return async (req, res, next) => {
    try {
      if (typeof schemaOrMap?.parseAsync === 'function') {
        req.body = await schemaOrMap.parseAsync(req.body);
      } else {
        if (schemaOrMap.params && req.params) {
          req.params = await schemaOrMap.params.parseAsync(req.params);
        }
        if (schemaOrMap.query && req.query) {
          req.query = await schemaOrMap.query.parseAsync(req.query);
        }
        if (schemaOrMap.body && req.body) {
          req.body = await schemaOrMap.body.parseAsync(req.body);
        }
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
