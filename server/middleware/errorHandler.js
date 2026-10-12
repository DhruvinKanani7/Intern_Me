import logger from '../config/logger.js';
import { AppError } from '../utils/AppError.js';
import { ZodError } from 'zod';

export const errorHandler = (err, req, res, next) => {
  const requestId = req.id || req.headers['x-request-id'] || 'unknown';

  // 1. Zod validation error
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
      request_id: requestId
    });
  }

  // 2. Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid format for field: ${err.path}`,
      request_id: requestId
    });
  }

  // 3. Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const formattedErrors = Object.values(err.errors || {}).map((val) => ({
      field: val.path,
      message: val.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
      request_id: requestId
    });
  }

  // 4. Mongo duplicate key error (code 11000)
  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'resource';
    return res.status(409).json({
      success: false,
      message: `A duplicate entry already exists for: ${duplicateField}`,
      request_id: requestId
    });
  }

  // 5. Custom operational AppError or explicit status errors (e.g. 413 PayloadTooLargeError)
  if (err instanceof AppError || err.isOperational || err.status || err.statusCode) {
    const statusCode = err.statusCode || err.status || 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
      request_id: requestId
    });
  }

  // 6. Generic/Unexpected 500 error
  logger.error(
    {
      requestId,
      method: req.method,
      url: req.originalUrl,
      err: {
        message: err.message,
        stack: err.stack,
        name: err.name
      }
    },
    'Internal Server Error'
  );

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    request_id: requestId
  });
};

export default errorHandler;
