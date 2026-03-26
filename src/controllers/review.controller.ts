import { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../utils/ApiError'
import { ApiResponse } from '../utils/ApiResponse'
import { asyncHandler } from '../utils/asyncHandler'

// ---- CREATE REVIEW ----
export const createReview = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id
    const { appointmentId, rating, comment } = req.body

    if (rating < 1 || rating > 5) {
      throw ApiError.badRequest('Rating must be between 1 and 5')
    }

    const patient = await prisma.patient.findUnique({ where: { userId } })
    if (!patient) throw ApiError.notFound('Patient not found')

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    })
    if (!appointment) throw ApiError.notFound('Appointment not found')
    if (appointment.patientId !== patient.id) throw ApiError.forbidden()
    if (appointment.status !== 'COMPLETED') {
      throw ApiError.badRequest('Can only review completed appointments')
    }

    const existing = await prisma.review.findUnique({
      where: { appointmentId },
    })
    if (existing) throw ApiError.conflict('You have already reviewed this appointment')

    const review = await prisma.review.create({
      data: {
        userId,
        appointmentId,
        doctorId: appointment.doctorId,
        rating,
        comment,
      },
    })

    // Update doctor average rating
    const stats = await prisma.review.aggregate({
      where: { doctorId: appointment.doctorId, isPublished: true },
      _avg: { rating: true },
      _count: { rating: true },
    })

    await prisma.doctor.update({
      where: { id: appointment.doctorId },
      data: {
        avgRating: stats._avg.rating ?? 0,
        totalReviews: stats._count.rating,
      },
    })

    res.status(201).json(ApiResponse.success('Review submitted', review))
  }
)

// ---- GET DOCTOR REVIEWS ----
export const getDoctorReviews = asyncHandler(
  async (req: Request, res: Response) => {
    const { doctorId } = req.params
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10)
    const skip = (page - 1) * limit

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { doctorId, isPublished: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            include: {
              patient: {
                select: { firstName: true, lastName: true, avatarUrl: true },
              },
            },
          },
        },
      }),
      prisma.review.count({ where: { doctorId, isPublished: true } }),
    ])

    res.json(
      ApiResponse.success('Reviews fetched', reviews, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    )
  }
)

// ---- UPDATE REVIEW ----
export const updateReview = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id
    const { id } = req.params
    const { rating, comment } = req.body

    if (rating < 1 || rating > 5) {
      throw ApiError.badRequest('Rating must be between 1 and 5')
    }

    const review = await prisma.review.findUnique({ where: { id } })
    if (!review) throw ApiError.notFound('Review not found')
    if (review.userId !== userId) throw ApiError.forbidden()

    const updated = await prisma.review.update({
      where: { id },
      data: { rating, comment },
    })

    // Recalculate doctor rating
    const stats = await prisma.review.aggregate({
      where: { doctorId: review.doctorId, isPublished: true },
      _avg: { rating: true },
      _count: { rating: true },
    })

    await prisma.doctor.update({
      where: { id: review.doctorId },
      data: {
        avgRating: stats._avg.rating ?? 0,
        totalReviews: stats._count.rating,
      },
    })

    res.json(ApiResponse.success('Review updated', updated))
  }
)

