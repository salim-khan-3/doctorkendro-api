import 'dotenv/config'
import http from 'http'
import app from './app'
import { prisma } from './config/prisma'

const PORT = process.env.PORT || 5000

const httpServer = http.createServer(app)

async function startServer() {
  try {
    // Test DB connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
      console.log(`📡 API: http://localhost:${PORT}/api/v1`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('unhandledRejection', (reason: Error) => {
  console.error('Unhandled Rejection:', reason)
})

startServer()