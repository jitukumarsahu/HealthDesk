import { Response, NextFunction } from 'express';
import { Notification } from '../models/Notification.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const getNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const userId = req.user!.id;

    const notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ recipientId: userId });
    const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
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

export const markAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const notification = await Notification.findById(id);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.recipientId.toString() !== userId) {
      throw new ForbiddenError('You cannot modify this notification');
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};
