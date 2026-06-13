import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const generateTokens = (user: IUser) => {
  const accessSecret = process.env.JWT_ACCESS_SECRET || 'your_super_secret_access_token_secret_key_1234567890';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'your_super_secret_refresh_token_secret_key_0987654321';

  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    accessSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    refreshSecret,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role, specialization, biography, experienceYears } = req.body;

    if (!name || !email || !password) {
      throw new BadRequestError('Name, email, and password are required');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new BadRequestError('Email is already registered');
    }

    // Role safety: normal registration only allows 'Patient'.
    // Admin can create Doctors or other Admins through Admin management endpoints.
    // If it is the first user in the database, let's allow it to be Admin for easier testing.
    let userRole = 'Patient';
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      userRole = 'Admin';
    } else if (role === 'Doctor' || role === 'Admin') {
      // Normal registration requests cannot create Admin/Doctor directly
      throw new BadRequestError('Unauthorized role selection. Doctor/Admin accounts must be created by an Admin.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      passwordHash,
      role: userRole,
    });

    await user.save();

    await createAuditLog({
      userId: user._id.toString(),
      action: 'AUTH_REGISTER',
      resource: 'Auth',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { role: userRole }
    });

    res.status(201).json({
      success: true,
      message: `${userRole} registered successfully. Please login.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Audit failed login attempt (user not found)
      await createAuditLog({
        userId: null,
        action: 'AUTH_LOGIN_FAILED',
        resource: 'Auth',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { email, reason: 'User not found' }
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Audit failed login attempt (wrong password)
      await createAuditLog({
        userId: user._id.toString(),
        action: 'AUTH_LOGIN_FAILED',
        resource: 'Auth',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { email, reason: 'Incorrect password' }
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token in user document
    user.refreshToken = refreshToken;
    await user.save();

    // Audit successful login
    await createAuditLog({
      userId: user._id.toString(),
      action: 'AUTH_LOGIN_SUCCESS',
      resource: 'Auth',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { role: user.role }
    });

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
    });

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is missing');
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'your_super_secret_refresh_token_secret_key_0987654321';
    
    let decodedPayload: any;
    try {
      decodedPayload = jwt.verify(refreshToken, refreshSecret);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await User.findById(decodedPayload.id);
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedError('Token mismatch or user revoked');
    }

    const tokens = generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
    });

    res.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const user = await User.findOne({ refreshToken });
      if (user) {
        user.refreshToken = undefined;
        await user.save();

        await createAuditLog({
          userId: user._id.toString(),
          action: 'AUTH_LOGOUT',
          resource: 'Auth',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Session not found');
    }

    const user = await User.findById(req.user.id).select('-passwordHash -refreshToken');
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};
