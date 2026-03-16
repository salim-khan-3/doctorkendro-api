import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ApiError } from '../utils/ApiError'

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Known operational errors
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    })
    return
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        res.status(409).json({
          success: false,
          message: `Already exists: ${(err.meta?.target as string[])?.join(', ')}`,
        })
        return
      case 'P2025':
        res.status(404).json({
          success: false,
          message: 'Record not found',
        })
        return
      default:
        res.status(400).json({
          success: false,
          message: 'Database error',
        })
        return
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, message: 'Invalid token' })
    return
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Token expired' })
    return
  }

  // Unknown errors
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
  })
}