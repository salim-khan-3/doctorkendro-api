import { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { ApiResponse } from '../utils/ApiResponse'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'

// ---- DASHBOARD STATS ----
export const getDashboardStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const [totalUsers, totalDoctors, totalPatients, totalAppointments] =
      await Promise.all([
        prisma.user.count(),
        prisma.doctor.count(),
        prisma.patient.count(),
        prisma.appointment.count(),
      ])

    res.json(
      ApiResponse.success('Stats fetched', {
        totalUsers,
        totalDoctors,
        totalPatients,
        totalAppointments,
      })
    )
  }
)

// ---- GET ALL USERS ----
export const getAllUsers = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10)
    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
    ])

    res.json(
      ApiResponse.success('Users fetched', users, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    )
  }
)

// ---- GET ALL PATIENTS ----
export const getAllPatients = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10)
    const skip = (page - 1) * limit

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { email: true, phone: true, isActive: true },
          },
        },
      }),
      prisma.patient.count(),
    ])

    res.json(
      ApiResponse.success('Patients fetched', patients, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    )
  }
)

// ---- GET ALL DOCTORS ----
export const getAllDoctors = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10)
    const skip = (page - 1) * limit

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { email: true, phone: true, isActive: true },
          },
          specializations: {
            include: { specialization: true },
          },
        },
      }),
      prisma.doctor.count(),
    ])

    res.json(
      ApiResponse.success('Doctors fetched', doctors, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    )
  }
)

// ---- VERIFY DOCTOR ----
export const verifyDoctor = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const { status } = req.body

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      throw ApiError.badRequest('Status must be VERIFIED or REJECTED')
    }

    const doctor = await prisma.doctor.update({
      where: { id },
      data: { verificationStatus: status },
    })

    res.json(ApiResponse.success(`Doctor ${status.toLowerCase()}`, doctor))
  }
)

// ---- TOGGLE USER STATUS ----
export const toggleUserStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw ApiError.notFound('User not found')

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, email: true, isActive: true },
    })

    res.json(ApiResponse.success('User status updated', updated))
  }
)