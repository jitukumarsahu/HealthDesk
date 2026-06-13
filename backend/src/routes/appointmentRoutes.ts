import { Router } from 'express';
import { 
  createSlots, 
  getAvailableSlots, 
  bookAppointment, 
  rescheduleAppointment, 
  cancelAppointment, 
  updateAppointmentStatus, 
  getAppointments,
  getDoctors,
  getDoctorPatients
} from '../controllers/appointmentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Protect all appointment routes
router.use(authenticateToken);

// Doctors catalogue list
router.get('/doctors', getDoctors);

// Doctors' patient list
router.get('/patients', authorizeRoles('Doctor'), getDoctorPatients);

// Slots management
router.post('/slots', authorizeRoles('Doctor'), createSlots);
router.get('/slots/available/:doctorId', getAvailableSlots);

// Appointments booking and management
router.post('/', authorizeRoles('Patient'), bookAppointment);
router.get('/', getAppointments);
router.patch('/:id', rescheduleAppointment);
router.post('/:id/cancel', cancelAppointment);
router.patch('/:id/status', authorizeRoles('Doctor', 'Admin', 'SuperAdmin'), updateAppointmentStatus);

export default router;
