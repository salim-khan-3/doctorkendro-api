import { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { ApiError } from '../utils/ApiError'
import { ApiResponse } from '../utils/ApiResponse'
import { asyncHandler } from '../utils/asyncHandler'

// ---- GET PATIENT PROFILE ----
export const getPatientProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id

    const patient = await prisma.patient.findUnique({
      where: { userId },
      include: { familyMembers: true },
    })

    if (!patient) throw ApiError.notFound('Patient not found')

    res.json(ApiResponse.success('Profile fetched', patient))
  }
)

// ---- UPDATE PATIENT PROFILE ----
export const updatePatientProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      city,
      avatarUrl,
    } = req.body

    const patient = await prisma.patient.findUnique({ where: { userId } })
    if (!patient) throw ApiError.notFound('Patient not found')

    const updated = await prisma.patient.update({
      where: { userId },
      data: {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        bloodGroup,
        address,
        city,
        avatarUrl,
      },
    })

    res.json(ApiResponse.success('Profile updated', updated))
  }
)

// ---- ADD FAMILY MEMBER ----
export const addFamilyMember = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id
    const { firstName, lastName, relation, dateOfBirth, gender, bloodGroup } =
      req.body

    const patient = await prisma.patient.findUnique({ where: { userId } })
    if (!patient) throw ApiError.notFound('Patient not found')

    const member = await prisma.familyMember.create({
      data: {
        patientId: patient.id,
        firstName,
        lastName,
        relation,
        gender,
        bloodGroup,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
    })

    res.status(201).json(ApiResponse.success('Family member added', member))
  }
)

// ---- DELETE FAMILY MEMBER ----
export const deleteFamilyMember = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id
    const memberId = req.params.memberId as string

    const patient = await prisma.patient.findUnique({ where: { userId } })
    if (!patient) throw ApiError.notFound('Patient not found')

    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
    })

    if (!member || member.patientId !== patient.id) {
      throw ApiError.forbidden('You cannot delete this family member')
    }

    await prisma.familyMember.delete({ where: { id: memberId } })

    res.json(ApiResponse.success('Family member removed'))
  }
)

// ---- GET MEDICAL RECORDS ----
export const getMedicalRecords = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id

    const patient = await prisma.patient.findUnique({ where: { userId } })
    if (!patient) throw ApiError.notFound('Patient not found')

    const records = await prisma.medicalRecord.findMany({
      where: { patientId: patient.id },
      orderBy: { recordDate: 'desc' },
    })

    res.json(ApiResponse.success('Medical records fetched', records))
  }
)

// ---- ADD MEDICAL RECORD ----
export const addMedicalRecord = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id
    const { title, description, fileUrl, fileType, recordDate } = req.body

    const patient = await prisma.patient.findUnique({ where: { userId } })
    if (!patient) throw ApiError.notFound('Patient not found')

    const record = await prisma.medicalRecord.create({
      data: {
        patientId: patient.id,
        title,
        description,
        fileUrl,
        fileType,
        recordDate: new Date(recordDate),
      },
    })

    res.status(201).json(ApiResponse.success('Record added', record))
  }
)

