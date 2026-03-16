import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, JwtPayload } from '../utils/jwt'
import { ApiError } from '../utils/ApiError'
import { prisma } from '../config/prisma'
import { Role } from '@prisma/client'

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { id: string }
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token =
      authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null

    if (!token) throw ApiError.unauthorized('No token provided')

    const decoded = verifyAccessToken(token)

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isActive: true },
    })

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Account is inactive')
    }

    req.user = { ...decoded, id: decoded.userId }
    next()
  } catch (error) {
    next(error)
  }
}

export const authorize = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized())
    }
    if (!roles.includes(req.user.role as Role)) {
      return next(
        ApiError.forbidden('You do not have permission to perform this action')
      )
    }
    next()
  }
}

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token =
      authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
    if (token) {
      const decoded = verifyAccessToken(token)
      req.user = { ...decoded, id: decoded.userId }
    }
    next()
  } catch {
    next()
  }
}