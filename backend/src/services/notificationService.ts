import { Notification } from '../models/Notification.js';
import { emitToUser } from '../config/socket.js';
import { logger } from '../utils/logger.js';

interface CreateNotificationParams {
  recipientId: string;
  title: string;
  message: string;
  type: 'AppointmentBooked' | 'AppointmentCancelled' | 'ScheduleUpdated' | 'PrescriptionCreated' | 'SystemAlert';
}

export const createNotification = async (params: CreateNotificationParams): Promise<void> => {
  try {
    // 1. Persist notification to database
    const notification = new Notification({
      recipientId: params.recipientId,
      title: params.title,
      message: params.message,
      type: params.type,
      isRead: false
    });

    await notification.save();
    logger.info(`Notification saved in database for user ${params.recipientId}: ${params.title}`);

    // 2. Emit real-time socket event
    emitToUser(params.recipientId, 'notification', {
      id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      createdAt: notification.createdAt
    });

  } catch (error) {
    logger.error(`Failed to create/send notification to user ${params.recipientId}:`, error);
  }
};
