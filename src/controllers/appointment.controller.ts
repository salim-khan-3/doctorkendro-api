import { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../utils/ApiError'
import { ApiResponse } from '../utils/ApiResponse'
import { asyncHandler } from '../utils/asyncHandler'

// ---- BOOK APPOINTMENT ----
export const bookAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id
    const {
      doctorId,
      type,
      scheduledAt,
      familyMemberId,
      notes,
    } = req.body

    // Get patient
    const patient = await prisma.patient.findUnique({ where: { userId } })
    if (!patient) throw ApiError.notFound('Patient not found')

    // Get doctor
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
    if (!doctor) throw ApiError.notFound('Doctor not found')
    if (doctor.verificationStatus !== 'VERIFIED') {
      throw ApiError.badRequest('Doctor is not verified yet')
    }

    // Determine fee
    const fee = type === 'IN_PERSON'
      ? (doctor.inPersonFee ?? 0)
      : (doctor.onlineFee ?? 0)

    // Check duplicate appointment
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId,
        patientId: patient.id,
        scheduledAt: new Date(scheduledAt),
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    })
    if (existing) {
      throw ApiError.conflict('You already have an appointment at this time')
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId,
        type,
        scheduledAt: new Date(scheduledAt),
        familyMemberId: familyMemberId || null,
        notes,
        fee,
        status: 'PENDING',
      },
      include: {
        doctor: {
          select: { firstName: true, lastName: true, inPersonFee: true, onlineFee: true },
        },
        patient: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    res.status(201).json(ApiResponse.success('Appointment booked', appointment))
  }
)

// ---- GET MY APPOINTMENTS (patient) ----
export const getMyAppointments = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10)
    const skip = (page - 1) * limit
    const { status } = req.query as { status?: string }

    const patient = await prisma.patient.findUnique({ where: { userId } })
    if (!patient) throw ApiError.notFound('Patient not found')

    const where: any = { patientId: patient.id }
    if (status) where.status = status.toUpperCase()

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
        include: {
          doctor: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
              specializations: {
                include: { specialization: true },
                where: { isPrimary: true },
              },
            },
          },
          review: { select: { id: true } },
        },
      }),
      prisma.appointment.count({ where }),
    ])

    res.json(
      ApiResponse.success('Appointments fetched', appointments, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    )
  }
)

// ---- GET DOCTOR'S APPOINTMENTS ----
export const getDoctorAppointments = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10)
    const skip = (page - 1) * limit
    const { status, date } = req.query as { status?: string; date?: string }

    const doctor = await prisma.doctor.findUnique({ where: { userId } })
    if (!doctor) throw ApiError.notFound('Doctor not found')

    const where: any = { doctorId: doctor.id }
    if (status) where.status = status.toUpperCase()
    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      where.scheduledAt = { gte: start, lte: end }
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
              gender: true,
              dateOfBirth: true,
            },
          },
          familyMember: true,
        },
      }),
      prisma.appointment.count({ where }),
    ])

    res.json(
      ApiResponse.success('Appointments fetched', appointments, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    )
  }
)

// ---- GET SINGLE APPOINTMENT ----
export const getAppointmentById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const userId = req.user!.id

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            avatarUrl: true,
            specializations: {
              include: { specialization: true },
              where: { isPrimary: true },
            },
          },
        },
        patient: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
        familyMember: true,
        review: true,
      },
    })

    if (!appointment) throw ApiError.notFound('Appointment not found')

    // Verify ownership
    const patient = await prisma.patient.findUnique({ where: { userId } })
    const doctor = await prisma.doctor.findUnique({ where: { userId } })

    const isOwner =
      patient?.id === appointment.patientId ||
      doctor?.id === appointment.doctorId

    if (!isOwner) throw ApiError.forbidden()

    res.json(ApiResponse.success('Appointment fetched', appointment))
  }
)

// ---- CONFIRM APPOINTMENT (doctor) ----
export const confirmAppointment = asyncHandler(
  async (req: Request, res: Response) => {
   const id = req.params.id as string
    const userId = req.user!.id

    const doctor = await prisma.doctor.findUnique({ where: { userId } })
    const appointment = await prisma.appointment.findUnique({ where: { id } })

    if (!appointment) throw ApiError.notFound('Appointment not found')
    if (appointment.doctorId !== doctor?.id) throw ApiError.forbidden()
    if (appointment.status !== 'PENDING') {
      throw ApiError.badRequest('Only pending appointments can be confirmed')
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    })

    res.json(ApiResponse.success('Appointment confirmed', updated))
  }
)

// ---- CANCEL APPOINTMENT ----
export const cancelAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const userId = req.user!.id
    const { reason } = req.body

    const appointment = await prisma.appointment.findUnique({ where: { id } })
    if (!appointment) throw ApiError.notFound('Appointment not found')

    const patient = await prisma.patient.findUnique({ where: { userId } })
    const doctor = await prisma.doctor.findUnique({ where: { userId } })

    const canCancel =
      patient?.id === appointment.patientId ||
      doctor?.id === appointment.doctorId

    if (!canCancel) throw ApiError.forbidden()

    if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
      throw ApiError.badRequest('Appointment is already completed or cancelled')
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED', cancellationReason: reason },
    })

    res.json(ApiResponse.success('Appointment cancelled', updated))
  }
)

// ---- COMPLETE APPOINTMENT (doctor) ----
export const completeAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const userId = req.user!.id

    const doctor = await prisma.doctor.findUnique({ where: { userId } })
    const appointment = await prisma.appointment.findUnique({ where: { id } })

    if (!appointment) throw ApiError.notFound('Appointment not found')
    if (appointment.doctorId !== doctor?.id) throw ApiError.forbidden()
    if (appointment.status !== 'CONFIRMED') {
      throw ApiError.badRequest('Only confirmed appointments can be completed')
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'COMPLETED' },
    })

    // Update doctor total patients
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { totalPatients: { increment: 1 } },
    })

    res.json(ApiResponse.success('Appointment completed', updated))
  }
)

