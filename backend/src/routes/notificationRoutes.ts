import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Protect all notification routes
router.use(authenticateToken);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);

export default router;
