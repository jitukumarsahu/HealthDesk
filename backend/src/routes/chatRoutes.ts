import { Router } from 'express';
import { sendMessage, getChatHistory } from '../controllers/chatController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Protect all chat routes
router.use(authenticateToken);

router.post('/messages', sendMessage);
router.get('/messages/:receiverId', getChatHistory);

export default router;
