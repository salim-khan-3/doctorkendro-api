import { Router } from 'express'
import {
  searchDoctors,
  getDoctorProfile,
  updateDoctorProfile,
  addClinic,
  upsertSchedule,
  addQualification,
  getMyDoctorProfile,
} from '../controllers/doctor.controller'
import { authenticate, authorize } from '../middlewares/auth.middleware'

const router = Router()

// Public routes
router.get('/', searchDoctors)
router.get('/:id', getDoctorProfile)

// Doctor only routes
router.get('/me/profile', authenticate, authorize('DOCTOR'), getMyDoctorProfile)
router.patch('/me/profile', authenticate, authorize('DOCTOR'), updateDoctorProfile)
router.post('/me/clinic', authenticate, authorize('DOCTOR'), addClinic)
router.post('/me/schedule', authenticate, authorize('DOCTOR'), upsertSchedule)
router.post('/me/qualification', authenticate, authorize('DOCTOR'), addQualification)

export default router

