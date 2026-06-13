import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Prescription } from '../models/Prescription.js';
import { User } from '../models/User.js';
import { Appointment } from '../models/Appointment.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';
import { generatePrescriptionPDF } from '../services/pdfService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Helper to check if a user is authorized to view a prescription
 */
const checkPrescriptionAccess = async (
  prescription: any,
  userId: string,
  userRole: string
): Promise<boolean> => {
  if (userRole === 'Admin') return true;

  const patientIdStr = prescription.patientId._id 
    ? prescription.patientId._id.toString() 
    : prescription.patientId.toString();

  const doctorIdStr = prescription.doctorId._id 
    ? prescription.doctorId._id.toString() 
    : prescription.doctorId.toString();

  if (patientIdStr === userId) return true;
  if (doctorIdStr === userId) return true;

  // Additional feature: A doctor can view a prescription if they have an active appointment with the patient
  if (userRole === 'Doctor') {
    const hasActiveAppointment = await Appointment.exists({
      doctorId: userId,
      patientId: patientIdStr,
      status: { $in: ['Pending', 'Confirmed'] }
    });
    if (hasActiveAppointment) return true;
  }

  return false;
};

/**
 * Doctor creates a prescription
 */
export const createPrescription = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { appointmentId, patientId, medicines, consultationNotes } = req.body;
    const doctorId = req.user!.id;

    if (!patientId || !medicines || !consultationNotes) {
      throw new BadRequestError('Patient ID, medicines list, and consultation notes are required');
    }

    // Verify patient exists and is indeed a patient
    const patientObj = await User.findById(patientId);
    if (!patientObj || patientObj.role !== 'Patient') {
      throw new BadRequestError('Invalid patient ID');
    }

    // Optional appointment verification
    if (appointmentId) {
      const appointmentObj = await Appointment.findById(appointmentId);
      if (!appointmentObj) {
        throw new NotFoundError('Associated appointment not found');
      }
      if (appointmentObj.doctorId.toString() !== doctorId) {
        throw new ForbiddenError('This appointment is not assigned to you');
      }
    }

    const prescription = new Prescription({
      appointmentId: appointmentId || undefined,
      patientId,
      doctorId,
      medicines,
      consultationNotes
    });

    await prescription.save();

    // Audit log
    await createAuditLog({
      userId: doctorId,
      action: 'CREATE_PRESCRIPTION',
      resource: 'Prescription',
      resourceId: prescription._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { patientId }
    });

    // Notify patient
    const doctorObj = await User.findById(doctorId);
    await createNotification({
      recipientId: patientId,
      title: 'New Prescription Received',
      message: `Dr. ${doctorObj?.name || 'Doctor'} has issued a new prescription for you.`,
      type: 'PrescriptionCreated'
    });

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      prescription
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List prescriptions (with pagination)
 */
export const getPrescriptions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const userId = req.user!.id;
    const role = req.user!.role;

    const query: any = {};
    if (role === 'Patient') {
      query.patientId = userId;
    } else if (role === 'Doctor') {
      query.doctorId = userId;
    }
    // Admin gets all by default, or filtered
    if (role === 'Admin') {
      if (req.query.patientId) query.patientId = req.query.patientId;
      if (req.query.doctorId) query.doctorId = req.query.doctorId;
    }

    const prescriptions = await Prescription.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email doctorProfile');

    const total = await Prescription.countDocuments(query);

    res.status(200).json({
      success: true,
      prescriptions,
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

/**
 * View prescription details (Tracks access audit trail)
 */
export const getPrescriptionById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const prescription = await Prescription.findById(id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email doctorProfile');

    if (!prescription) {
      throw new NotFoundError('Prescription not found');
    }

    // Check RBAC access
    const isAuthorized = await checkPrescriptionAccess(prescription, userId, userRole);
    if (!isAuthorized) {
      throw new ForbiddenError('You are not authorized to view this prescription');
    }

    // Write audit log trail
    await createAuditLog({
      userId,
      action: 'VIEW_PRESCRIPTION',
      resource: 'Prescription',
      resourceId: prescription._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      prescription
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download prescription PDF (Tracks access audit trail)
 */
export const downloadPrescriptionPDF = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      throw new NotFoundError('Prescription not found');
    }

    // Check RBAC access
    const isAuthorized = await checkPrescriptionAccess(prescription, userId, userRole);
    if (!isAuthorized) {
      throw new ForbiddenError('You are not authorized to download this prescription');
    }

    // Load full doctor and patient models for formatting PDF
    const doctor = await User.findById(prescription.doctorId);
    const patient = await User.findById(prescription.patientId);

    if (!doctor || !patient) {
      throw new BadRequestError('Doctor or Patient associated with this prescription no longer exists');
    }

    // Generate PDF Buffer
    const pdfBuffer = await generatePrescriptionPDF(prescription, doctor, patient);

    // Audit log
    await createAuditLog({
      userId,
      action: 'DOWNLOAD_PRESCRIPTION_PDF',
      resource: 'Prescription',
      resourceId: prescription._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Send headers and PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=prescription-${prescription._id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
