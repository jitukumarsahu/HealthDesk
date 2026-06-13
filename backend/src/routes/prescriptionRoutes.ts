import { Router } from 'express';
import { 
  createPrescription, 
  getPrescriptions, 
  getPrescriptionById, 
  downloadPrescriptionPDF 
} from '../controllers/prescriptionController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Protect all prescription routes
router.use(authenticateToken);

router.post('/', authorizeRoles('Doctor'), createPrescription);
router.get('/', getPrescriptions);
router.get('/:id', getPrescriptionById);
router.get('/:id/download', downloadPrescriptionPDF);

export default router;
