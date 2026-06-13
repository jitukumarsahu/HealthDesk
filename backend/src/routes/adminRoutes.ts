import { Router } from 'express';
import { 
  createDoctor, 
  createAdmin, 
  getAuditLogs,
  getDoctors,
  getPatients,
  toggleUserActive
} from '../controllers/adminController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Protect all admin routes
router.use(authenticateToken);
router.use(authorizeRoles('Admin', 'SuperAdmin'));

router.post('/doctors', createDoctor);
router.post('/admins', createAdmin);
router.get('/audit-logs', getAuditLogs);

// Accounts list & filters
router.get('/doctors', getDoctors);
router.get('/patients', getPatients);

// Activation toggle (SuperAdmin only)
router.patch('/users/:id/toggle-active', authorizeRoles('SuperAdmin'), toggleUserActive);

export default router;
