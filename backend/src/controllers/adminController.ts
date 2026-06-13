import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const createDoctor = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, specialization, biography, experienceYears } = req.body;

    if (!name || !email || !password || !specialization) {
      throw new BadRequestError('Name, email, password, and specialization are required');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new BadRequestError('Email is already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const doctor = new User({
      name,
      email,
      passwordHash,
      role: 'Doctor',
      doctorProfile: {
        specialization,
        biography,
        experienceYears
      }
    });

    await doctor.save();

    await createAuditLog({
      userId: req.user!.id,
      action: 'ADMIN_CREATE_DOCTOR',
      resource: 'User',
      resourceId: doctor._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { doctorEmail: email }
    });

    res.status(201).json({
      success: true,
      message: 'Doctor account created successfully',
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        role: doctor.role,
        doctorProfile: doctor.doctorProfile
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new BadRequestError('Name, email, and password are required');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new BadRequestError('Email is already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = new User({
      name,
      email,
      passwordHash,
      role: 'Admin'
    });

    await admin.save();

    await createAuditLog({
      userId: req.user!.id,
      action: 'ADMIN_CREATE_ADMIN',
      resource: 'User',
      resourceId: admin._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { adminEmail: email }
    });

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (req.query.action) {
      query.action = req.query.action;
    }
    if (req.query.resource) {
      query.resource = req.query.resource;
    }
    if (req.query.userId) {
      query.userId = req.query.userId;
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email role');

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctors = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query: any = { role: 'Doctor' };

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { 'doctorProfile.specialization': searchRegex }
      ];
    }

    if (req.query.isActive) {
      query.isActive = req.query.isActive === 'true';
    }

    const doctors = await User.find(query)
      .select('-passwordHash -refreshToken')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      doctors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPatients = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query: any = { role: 'Patient' };

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
    }

    if (req.query.isActive) {
      query.isActive = req.query.isActive === 'true';
    }

    const patients = await User.find(query)
      .select('-passwordHash -refreshToken')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      patients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserActive = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.id;

    if (id === adminId) {
      throw new BadRequestError('You cannot deactivate your own account');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role === 'SuperAdmin') {
      throw new BadRequestError('SuperAdmin accounts cannot be deactivated');
    }

    user.isActive = !user.isActive;
    await user.save();

    await createAuditLog({
      userId: adminId,
      action: `ADMIN_TOGGLE_USER_ACTIVE_${user.isActive ? 'ACTIVATE' : 'DEACTIVATE'}`,
      resource: 'User',
      resourceId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { targetEmail: user.email, isActive: user.isActive }
    });

    res.status(200).json({
      success: true,
      message: `User account has been successfully ${user.isActive ? 'activated' : 'deactivated'}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};
