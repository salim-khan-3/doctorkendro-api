import { z } from 'zod'

export const registerEmailSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    role: z.enum(['PATIENT', 'DOCTOR']).optional(),
  }),
})

export const registerPhoneSchema = z.object({
  body: z.object({
    phone: z
      .string()
      .regex(/^(\+92|0)?3[0-9]{9}$/, 'Invalid phone number'),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  }),
})

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Invalid phone number'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
})

export const loginEmailSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
})

export const loginPhoneSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Invalid phone number'),
  }),
})

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
})

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
  }),
})