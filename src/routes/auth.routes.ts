import { Router } from 'express'
import {
  registerWithEmail,
  registerWithPhone,
  verifyPhoneOtp,
  loginWithEmail,
  loginWithPhone,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
} from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { validate } from '../middlewares/validate.middleware'
import {
  registerEmailSchema,
  registerPhoneSchema,
  loginEmailSchema,
  loginPhoneSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator'

const router = Router()

// Public routes
router.post('/register/email', validate(registerEmailSchema), registerWithEmail)
router.post('/register/phone', validate(registerPhoneSchema), registerWithPhone)
router.post('/verify-otp', validate(verifyOtpSchema), verifyPhoneOtp)
router.post('/login/email', validate(loginEmailSchema), loginWithEmail)
router.post('/login/phone', validate(loginPhoneSchema), loginWithPhone)
router.post('/refresh-token', refreshToken)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), resetPassword)

// Protected routes
router.post('/logout', authenticate, logout)
router.get('/me', authenticate, getMe)

export default router