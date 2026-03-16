import jwt, { SignOptions } from 'jsonwebtoken'
import { ApiError } from './ApiError'

export interface JwtPayload {
  userId: string
  role: string
  email?: string
  phone?: string
}

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  } as SignOptions)
}

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as SignOptions)
}

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET as string
    ) as JwtPayload
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token')
  }
}

export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET as string
    ) as JwtPayload
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token')
  }
}

export const generateTokenPair = (payload: JwtPayload) => ({
  accessToken: generateAccessToken(payload),
  refreshToken: generateRefreshToken(payload),
})