import { Response, NextFunction } from 'express';
import { Message } from '../models/Message.js';
import { Appointment } from '../models/Appointment.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { emitToUser } from '../config/socket.js';

export const sendMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { receiverId, appointmentId, text } = req.body;
    const senderId = req.user!.id;

    if (!receiverId || !appointmentId || !text) {
      throw new BadRequestError('receiverId, appointmentId, and text are required');
    }

    // Verify if there is a Confirmed appointment between sender and receiver
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    // Check if the current user is part of the appointment
    const isPatient = appointment.patientId.toString() === senderId && appointment.doctorId.toString() === receiverId;
    const isDoctor = appointment.doctorId.toString() === senderId && appointment.patientId.toString() === receiverId;

    if (!isPatient && !isDoctor) {
      throw new ForbiddenError('You are not authorized to send messages for this appointment');
    }

    // If the appointment is Completed or Cancelled or anything except Confirmed, block sending messages
    if (appointment.status !== 'Confirmed') {
      throw new BadRequestError(`Cannot send message. Chat is only active for Confirmed appointments (Current status: ${appointment.status})`);
    }

    const message = new Message({
      senderId,
      receiverId,
      appointmentId,
      text
    });

    await message.save();

    // Emit real-time message event via Socket.io
    emitToUser(receiverId, 'message', message);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    next(error);
  }
};

export const getChatHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user!.id;

    if (!receiverId) {
      throw new BadRequestError('receiverId is required');
    }

    // Fetch messages between sender and receiver (in either direction)
    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    next(error);
  }
};
