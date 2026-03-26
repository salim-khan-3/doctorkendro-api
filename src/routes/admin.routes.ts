import { Router } from 'express'
import {
  getAllUsers,
  getAllPatients,
  getAllDoctors,
  verifyDoctor,
  toggleUserStatus,
  getDashboardStats,
} from '../controllers/admin.controller'
import { authenticate, authorize } from '../middlewares/auth.middleware'

const router = Router()

router.use(authenticate, authorize('SUPER_ADMIN'))

router.get('/stats', getDashboardStats)
router.get('/users', getAllUsers)
router.get('/patients', getAllPatients)
router.get('/doctors', getAllDoctors)
router.patch('/doctors/:id/verify', verifyDoctor)
router.patch('/users/:id/toggle-status', toggleUserStatus)

export default router