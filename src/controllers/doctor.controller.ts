import { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../utils/ApiError'
import { ApiResponse } from '../utils/ApiResponse'
import { asyncHandler } from '../utils/asyncHandler'
import { DayOfWeek } from '@prisma/client'

// ---- SEARCH DOCTORS ----
export const searchDoctors = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10)
    const skip = (page - 1) * limit

    const {
      q,
      specialization,
      city,
      gender,
      type,
      minFee,
      maxFee,
      minRating,
      sortBy = 'avgRating',
      order = 'desc',
    } = req.query as Record<string, string>

    const where: any = {
      verificationStatus: 'VERIFIED',
      user: { isActive: true },
    }

    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        {
          specializations: {
            some: {
              specialization: {
                name: { contains: q, mode: 'insensitive' },
              },
            },
          },
        },
      ]
    }

    if (specialization) {
      where.specializations = {
        some: { specialization: { slug: specialization } },
      }
    }

    if (city) {
      where.clinics = {
        some: { city: { equals: city, mode: 'insensitive' }, isActive: true },
      }
    }

    if (gender) where.gender = gender.toUpperCase()
    if (type === 'online') where.isAvailableOnline = true

    if (minFee || maxFee) {
      where.inPersonFee = {}
      if (minFee) where.inPersonFee.gte = parseFloat(minFee)
      if (maxFee) where.inPersonFee.lte = parseFloat(maxFee)
    }

    if (minRating) where.avgRating = { gte: parseFloat(minRating) }

    const orderByMap: Record<string, any> = {
      avgRating: { avgRating: order },
      experience: { experience: order },
      fee: { inPersonFee: order },
      totalPatients: { totalPatients: order },
    }

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderByMap[sortBy] || { avgRating: 'desc' },
        include: {
          user: { select: { email: true, phone: true } },
          specializations: {
            include: { specialization: true },
            where: { isPrimary: true },
          },
          qualifications: true,
          clinics: {
            where: { isActive: true },
            select: { city: true, fee: true, clinicName: true },
          },
        },
      }),
      prisma.doctor.count({ where }),
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

// ---- GET SINGLE DOCTOR PROFILE ----
export const getDoctorProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params

    const doctor = await prisma.doctor.findFirst({
      where: {
        OR: [{ id }, { userId: id }],
        verificationStatus: 'VERIFIED',
      },
      include: {
        user: { select: { email: true, phone: true } },
        specializations: { include: { specialization: true } },
        qualifications: true,
        clinics: { where: { isActive: true } },
      },
    })

    if (!doctor) throw ApiError.notFound('Doctor not found')

    res.json(ApiResponse.success('Doctor profile fetched', doctor))
  }
)

// ---- UPDATE DOCTOR PROFILE (self) ----
export const updateDoctorProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id
    const {
      firstName,
      lastName,
      about,
      experience,
      isAvailableOnline,
      onlineFee,
      inPersonFee,
      gender,
    } = req.body

    const doctor = await prisma.doctor.findUnique({ where: { userId } })
    if (!doctor) throw ApiError.notFound('Doctor profile not found')

    const updated = await prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        firstName,
        lastName,
        about,
        experience,
        isAvailableOnline,
        onlineFee,
        inPersonFee,
        gender,
      },
    })

    res.json(ApiResponse.success('Profile updated', updated))
  }
)

// ---- ADD CLINIC ----
export const addClinic = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id
    const { clinicName, address, city, phone, fee, latitude, longitude } =
      req.body

    const doctor = await prisma.doctor.findUnique({ where: { userId } })
    if (!doctor) throw ApiError.notFound('Doctor not found')

    const clinic = await prisma.doctorClinic.create({
      data: {
        doctorId: doctor.id,
        clinicName,
        address,
        city,
        phone,
        fee,
        latitude,
        longitude,
      },
    })

    res.status(201).json(ApiResponse.success('Clinic added', clinic))
  }
)

// ---- SET SCHEDULE ----
export const upsertSchedule = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id

    const doctor = await prisma.doctor.findUnique({ where: { userId } })
    if (!doctor) throw ApiError.notFound('Doctor not found')

    const { schedules } = req.body as {
      schedules: Array<{
        dayOfWeek: DayOfWeek
        startTime: string
        endTime: string
        slotDuration: number
        maxPatients: number
        clinicId?: string
        isAvailable: boolean
      }>
    }

    await prisma.doctorSchedule.deleteMany({
      where: { doctorId: doctor.id },
    })

    const created = await prisma.doctorSchedule.createMany({
      data: schedules.map((s) => ({ ...s, doctorId: doctor.id })),
    })

    res.json(ApiResponse.success('Schedule updated', { count: created.count }))
  }
)

// ---- ADD QUALIFICATION ----
export const addQualification = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id
    const { degree, institution, year, country } = req.body

    const doctor = await prisma.doctor.findUnique({ where: { userId } })
    if (!doctor) throw ApiError.notFound('Doctor not found')

    const qualification = await prisma.doctorQualification.create({
      data: {
        doctorId: doctor.id,
        degree,
        institution,
        year,
        country,
      },
    })

    res
      .status(201)
      .json(ApiResponse.success('Qualification added', qualification))
  }
)

// ---- GET MY DOCTOR PROFILE ----
export const getMyDoctorProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id

    const doctor = await prisma.doctor.findUnique({
      where: { userId },
      include: {
        specializations: { include: { specialization: true } },
        qualifications: true,
        clinics: true,
        schedules: true,
      },
    })

    if (!doctor) throw ApiError.notFound('Doctor profile not found')

    res.json(ApiResponse.success('Profile fetched', doctor))
  }
)

