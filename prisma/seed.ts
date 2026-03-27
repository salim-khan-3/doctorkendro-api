import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ---- SPECIALIZATIONS ----
  const specializations = [
    { name: 'Gynecologist', slug: 'gynecologist', description: 'Female reproductive health' },
    { name: 'Dermatologist', slug: 'dermatologist', description: 'Skin, hair and nail conditions' },
    { name: 'Cardiologist', slug: 'cardiologist', description: 'Heart and cardiovascular system' },
    { name: 'Neurologist', slug: 'neurologist', description: 'Brain and nervous system' },
    { name: 'Orthopedic Surgeon', slug: 'orthopedic-surgeon', description: 'Bones, joints and muscles' },
    { name: 'Pediatrician', slug: 'pediatrician', description: 'Children health' },
    { name: 'Psychiatrist', slug: 'psychiatrist', description: 'Mental health' },
    { name: 'General Physician', slug: 'general-physician', description: 'General health issues' },
    { name: 'ENT Specialist', slug: 'ent-specialist', description: 'Ear, nose and throat' },
    { name: 'Urologist', slug: 'urologist', description: 'Urinary tract disorders' },
    { name: 'Gastroenterologist', slug: 'gastroenterologist', description: 'Digestive system' },
    { name: 'Ophthalmologist', slug: 'ophthalmologist', description: 'Eyes and vision' },
    { name: 'Dentist', slug: 'dentist', description: 'Oral health and teeth' },
  ]

  for (const spec of specializations) {
    await prisma.specialization.upsert({
      where: { slug: spec.slug },
      update: {},
      create: spec,
    })
  }
  console.log('✅ Specializations seeded')

  // ---- SUPER ADMIN ----
  const adminPassword = await bcrypt.hash('Admin@12345', 12)
  await prisma.user.upsert({
    where: { email: 'admin@doctorkendro.com' },
    update: {},
    create: {
      email: 'admin@doctorkendro.com',
      passwordHash: adminPassword,
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
    },
  })
  console.log('✅ Admin seeded')

  console.log('\n🎉 Seeding complete!')
  console.log('Admin: admin@doctorkendro.com / Admin@12345')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })