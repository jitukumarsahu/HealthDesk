import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment.js';
import { Slot } from '../models/Slot.js';
import { User } from '../models/User.js';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Doctor creates slots in bulk
 */
export const createSlots = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { dates, duration = 30 } = req.body; // array of ISO date strings
    const doctorId = req.user!.id;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      throw new BadRequestError('An array of dates is required');
    }

    const createdSlots = [];
    const errors = [];

    for (const dateStr of dates) {
      const dateTime = new Date(dateStr);
      
      if (isNaN(dateTime.getTime())) {
        errors.push({ date: dateStr, error: 'Invalid date format' });
        continue;
      }

      if (dateTime < new Date()) {
        errors.push({ date: dateStr, error: 'Cannot create slots in the past' });
        continue;
      }

      try {
        const slot = new Slot({
          doctorId,
          dateTime,
          duration,
          isBooked: false
        });
        await slot.save();
        createdSlots.push(slot);
      } catch (err: any) {
        if (err.code === 11000) {
          errors.push({ date: dateStr, error: 'Slot already exists for this date and time' });
        } else {
          errors.push({ date: dateStr, error: err.message });
        }
      }
    }

    await createAuditLog({
      userId: doctorId,
      action: 'DOCTOR_CREATE_SLOTS',
      resource: 'Slot',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { countRequested: dates.length, countCreated: createdSlots.length }
    });

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdSlots.length} slots. ${errors.length} failed.`,
      slots: createdSlots,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public/Patient endpoint to view a doctor's available slots
 */
export const getAvailableSlots = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate } = req.query;

    if (!doctorId) {
      throw new BadRequestError('Doctor ID is required');
    }

    const query: any = {
      doctorId,
      isBooked: false,
      dateTime: { $gte: new Date() } // only future slots
    };

    if (startDate || endDate) {
      query.dateTime = { ...query.dateTime };
      if (startDate) query.dateTime.$gte = new Date(startDate as string);
      if (endDate) query.dateTime.$lte = new Date(endDate as string);
    }

    const slots = await Slot.find(query).sort({ dateTime: 1 });

    res.status(200).json({
      success: true,
      slots
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Patient books an appointment
 */
export const bookAppointment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { slotId, reason } = req.body;
    const patientId = req.user!.id;

    if (!slotId || !reason) {
      throw new BadRequestError('Slot ID and reason are required');
    }

    // Atomic update to lock the slot
    // This is the CRITICAL validation step to prevent duplicate bookings server-side
    const slot = await Slot.findOneAndUpdate(
      { _id: slotId, isBooked: false },
      { isBooked: true },
      { new: true }
    );

    if (!slot) {
      throw new ConflictError('This slot is already booked or does not exist');
    }

    const appointment = new Appointment({
      patientId,
      doctorId: slot.doctorId,
      slotId: slot._id,
      dateTime: slot.dateTime,
      duration: slot.duration,
      status: 'Pending',
      reason
    });

    await appointment.save();

    // Audit trail
    await createAuditLog({
      userId: patientId,
      action: 'PATIENT_BOOK_APPOINTMENT',
      resource: 'Appointment',
      resourceId: appointment._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { slotId, doctorId: slot.doctorId }
    });

    // Notify Doctor (real-time + db)
    const patient = await User.findById(patientId);
    await createNotification({
      recipientId: slot.doctorId.toString(),
      title: 'New Appointment Booking',
      message: `Patient ${patient?.name || 'Unknown'} has booked an appointment for ${slot.dateTime.toLocaleString()}`,
      type: 'AppointmentBooked'
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully and is pending confirmation',
      appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reschedule appointment
 */
export const rescheduleAppointment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { newSlotId } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!newSlotId) {
      throw new BadRequestError('New slot ID is required');
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    // RBAC: Only patient who booked, the doctor assigned, or Admin can reschedule
    if (userRole !== 'Admin' && 
        appointment.patientId.toString() !== userId && 
        appointment.doctorId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to reschedule this appointment');
    }

    if (appointment.status === 'Completed' || appointment.status === 'Cancelled') {
      throw new BadRequestError(`Cannot reschedule a ${appointment.status.toLowerCase()} appointment`);
    }

    // Atomic update to lock new slot
    const newSlot = await Slot.findOneAndUpdate(
      { _id: newSlotId, isBooked: false },
      { isBooked: true },
      { new: true }
    );

    if (!newSlot) {
      throw new ConflictError('The new slot is already booked or does not exist');
    }

    const oldSlotId = appointment.slotId;
    const oldDateTime = appointment.dateTime;

    // Release old slot (if existed)
    if (oldSlotId) {
      await Slot.findByIdAndUpdate(oldSlotId, { isBooked: false });
    }

    // Update appointment
    appointment.slotId = newSlot._id as mongoose.Types.ObjectId;
    appointment.dateTime = newSlot.dateTime;
    appointment.status = 'Pending'; // resets confirmation status
    await appointment.save();

    // Audit log
    await createAuditLog({
      userId,
      action: 'RESCHEDULE_APPOINTMENT',
      resource: 'Appointment',
      resourceId: appointment._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { oldDateTime, newDateTime: newSlot.dateTime }
    });

    // Notifications
    const updaterName = (await User.findById(userId))?.name || 'System';
    const recipientId = userRole === 'Patient' ? appointment.doctorId.toString() : appointment.patientId.toString();
    
    await createNotification({
      recipientId,
      title: 'Appointment Rescheduled',
      message: `${updaterName} has rescheduled the appointment to ${newSlot.dateTime.toLocaleString()}`,
      type: 'ScheduleUpdated'
    });

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully and is pending confirmation',
      appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel appointment
 */
export const cancelAppointment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    // RBAC: Only patient who booked, doctor, or Admin can cancel
    if (userRole !== 'Admin' && 
        appointment.patientId.toString() !== userId && 
        appointment.doctorId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to cancel this appointment');
    }

    if (appointment.status === 'Cancelled') {
      throw new BadRequestError('Appointment is already cancelled');
    }

    if (appointment.status === 'Completed') {
      throw new BadRequestError('Cannot cancel a completed appointment');
    }

    // Cancel appointment
    appointment.status = 'Cancelled';
    await appointment.save();

    // Release slot
    if (appointment.slotId) {
      await Slot.findByIdAndUpdate(appointment.slotId, { isBooked: false });
    }

    // Audit log
    await createAuditLog({
      userId,
      action: 'CANCEL_APPOINTMENT',
      resource: 'Appointment',
      resourceId: appointment._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Notify other party
    const cancellerName = (await User.findById(userId))?.name || 'System';
    const recipientId = userRole === 'Patient' ? appointment.doctorId.toString() : appointment.patientId.toString();

    await createNotification({
      recipientId,
      title: 'Appointment Cancelled',
      message: `${cancellerName} has cancelled the appointment for ${appointment.dateTime.toLocaleString()}`,
      type: 'AppointmentCancelled'
    });

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update appointment status (Doctor/Admin only)
 */
export const updateAppointmentStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Confirmed' | 'Completed'
    const userId = req.user!.id;

    if (!['Confirmed', 'Completed'].includes(status)) {
      throw new BadRequestError('Invalid status update. Only Confirmed and Completed are allowed.');
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    // Only assigned doctor or Admin
    if (req.user!.role !== 'Admin' && appointment.doctorId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to manage this appointment');
    }

    appointment.status = status;
    await appointment.save();

    // Audit log
    await createAuditLog({
      userId,
      action: `UPDATE_APPOINTMENT_STATUS_${status.toUpperCase()}`,
      resource: 'Appointment',
      resourceId: appointment._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Notify patient
    await createNotification({
      recipientId: appointment.patientId.toString(),
      title: `Appointment ${status}`,
      message: `Your appointment on ${appointment.dateTime.toLocaleString()} has been marked as ${status.toLowerCase()}`,
      type: 'ScheduleUpdated'
    });

    res.status(200).json({
      success: true,
      message: `Appointment successfully marked as ${status.toLowerCase()}`,
      appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get appointments list (with pagination)
 */
export const getAppointments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
    // Admin gets all by default, unless filtered by query params
    if (role === 'Admin') {
      if (req.query.patientId) query.patientId = req.query.patientId;
      if (req.query.doctorId) query.doctorId = req.query.doctorId;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const appointments = await Appointment.find(query)
      .sort({ dateTime: 1 })
      .skip(skip)
      .limit(limit)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email doctorProfile');

    const total = await Appointment.countDocuments(query);

    res.status(200).json({
      success: true,
      appointments,
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
 * Retrieve list of all doctors
 */
export const getDoctors = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const doctors = await User.find({ role: 'Doctor' }).select('name email doctorProfile');
    res.status(200).json({
      success: true,
      doctors
    });
  } catch (error) {
    next(error);
  }
};

