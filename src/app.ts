import express, { Application, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { errorHandler } from './middlewares/errorHandler'
import { ApiError } from './utils/ApiError'

// Routes
import authRoutes from './routes/auth.routes'
import patientRoutes from './routes/patient.routes'
import doctorRoutes from './routes/doctor.routes'
import appointmentRoutes from './routes/appointment.routes'
import reviewRoutes from './routes/review.routes'
import adminRoutes from './routes/admin.routes'

const app: Application = express()

// ============================================================
// MIDDLEWARES
// ============================================================
app.use(helmet())

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(morgan('dev'))

// ============================================================
// ROUTES
// ============================================================
const API = '/api/v1'

app.use(`${API}/auth`, authRoutes)
app.use(`${API}/patients`, patientRoutes)
app.use(`${API}/doctors`, doctorRoutes)
app.use(`${API}/appointments`, appointmentRoutes)
app.use(`${API}/reviews`, reviewRoutes)
app.use(`${API}/admin`, adminRoutes)

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// 404 handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(404, 'Route not found'))
})

// Global error handler
app.use(errorHandler)

export default app