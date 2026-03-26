import { Router } from 'express'
import {
  bookAppointment,
  getMyAppointments,
  getDoctorAppointments,
  getAppointmentById,
  confirmAppointment,
  cancelAppointment,
  completeAppointment,
} from '../controllers/appointment.controller'
import { authenticate, authorize } from '../middlewares/auth.middleware'

const router = Router()

router.use(authenticate)

// Patient routes
router.post('/', authorize('PATIENT'), bookAppointment)
router.get('/my', authorize('PATIENT'), getMyAppointments)

// Doctor routes
router.get('/doctor', authorize('DOCTOR'), getDoctorAppointments)
router.patch('/:id/confirm', authorize('DOCTOR'), confirmAppointment)
router.patch('/:id/complete', authorize('DOCTOR'), completeAppointment)

// Shared routes
router.get('/:id', getAppointmentById)
router.patch('/:id/cancel', cancelAppointment)

export default router

