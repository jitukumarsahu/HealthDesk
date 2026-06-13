import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle custom HTTP errors
  if (err instanceof HttpError) {
    logger.warn(`Client Error [${err.statusCode}] at ${req.method} ${req.originalUrl}: ${err.message}`);
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
    });
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  // Handle JSON parsing syntax errors
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON payload',
    });
  }

  // Unhandled errors (Server crash level)
  logger.error(`Unhandled Server Error at ${req.method} ${req.originalUrl}:`, err);
  
  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error occurred' 
      : err.message,
  });
};
