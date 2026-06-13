import { Router } from 'express';
import { createDoctor, createAdmin, getAuditLogs } from '../controllers/adminController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Protect all admin routes
router.use(authenticateToken);
router.use(authorizeRoles('Admin'));

router.post('/doctors', createDoctor);
router.post('/admins', createAdmin);
router.get('/audit-logs', getAuditLogs);

export default router;
