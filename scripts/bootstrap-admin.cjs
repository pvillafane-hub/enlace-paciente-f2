'use strict'
// Explicit, idempotent bootstrap for an EMPTY or newly provisioned database.
// Usage: ADMIN_BOOTSTRAP_EMAIL=... ADMIN_BOOTSTRAP_PASSWORD=... node scripts/bootstrap-admin.cjs
// Never print the password or the database URL.
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const prisma = new PrismaClient()

async function main() {
  const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase()
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || ''
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 16) {
    throw new Error('Set a valid ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD (at least 16 characters)')
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    if (existing.role !== 'ADMIN' || !existing.active) {
      throw new Error('Bootstrap email belongs to a non-admin or inactive account; manual review required')
    }
    console.log('Admin account already exists and is active; no changes made')
    return
  }
  const passwordHash = await bcrypt.hash(password, 12)
  try {
    await prisma.user.create({
      data: { email, passwordHash, fullName: 'Administrador Enlace Salud', role: 'ADMIN', active: true },
    })
    console.log('Initial administrator account created')
  } catch (error) {
    if (error.code === 'P2002') {
      const admin = await prisma.user.findUnique({ where: { email } })
      if (admin?.role === 'ADMIN' && admin.active) {
        console.log('Admin account already exists; no changes made')
        return
      }
    }
    throw error
  }
}
main().catch(err => { console.error(err.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
