import { Router } from 'express'
import {
  getPatientProfile,
  updatePatientProfile,
  addFamilyMember,
  deleteFamilyMember,
  getMedicalRecords,
  addMedicalRecord,
} from '../controllers/patient.controller'
import { authenticate, authorize } from '../middlewares/auth.middleware'

const router = Router()

router.use(authenticate, authorize('PATIENT'))

router.get('/profile', getPatientProfile)
router.patch('/profile', updatePatientProfile)
router.post('/family', addFamilyMember)
router.delete('/family/:memberId', deleteFamilyMember)
router.get('/medical-records', getMedicalRecords)
router.post('/medical-records', addMedicalRecord)

export default router