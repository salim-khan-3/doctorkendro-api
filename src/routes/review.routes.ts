import { Router } from 'express'
import {
  createReview,
  getDoctorReviews,
  updateReview,
} from '../controllers/review.controller'
import { authenticate, authorize } from '../middlewares/auth.middleware'

const router = Router()

// Public
router.get('/doctor/:doctorId', getDoctorReviews)

// Patient only
router.post('/', authenticate, authorize('PATIENT'), createReview)
router.patch('/:id', authenticate, authorize('PATIENT'), updateReview)

export default router

