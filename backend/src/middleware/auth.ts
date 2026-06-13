import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export interface UserPayload {
  id: string;
  email: string;
  role: 'Admin' | 'Doctor' | 'Patient';
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new UnauthorizedError('Access token is missing');
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET || 'your_super_secret_access_token_secret_key_1234567890';
    const decoded = jwt.verify(token, secret) as UserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired');
    }
    throw new UnauthorizedError('Invalid access token');
  }
};

export const authorizeRoles = (...roles: ('Admin' | 'Doctor' | 'Patient')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }

    next();
  };
};
