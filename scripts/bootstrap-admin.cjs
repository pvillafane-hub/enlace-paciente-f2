'use strict'
// One-time, operator-run bootstrap. NEVER expose this script through an HTTP route.
// Run only after verifying the target DATABASE_URL points to the intended EMPTY V2 database.
// Environment variables: ADMIN_BOOTSTRAP_CONFIRM=CREATE_INITIAL_ADMIN,
// ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_PASSWORD, DATABASE_URL.
// Do not store credentials in Git, build logs, Vercel environment variables, or shell history.
const { PrismaClient, Prisma } = require('@prisma/client')
const bcrypt = require('bcrypt')
const prisma = new PrismaClient()

async function main() {
  if (process.env.ADMIN_BOOTSTRAP_CONFIRM !== 'CREATE_INITIAL_ADMIN') {
    throw new Error('Bootstrap not confirmed; no changes made')
  }
  const url = process.env.DATABASE_URL || ''
  if (!/^postgres(ql)?:\/\//.test(url)) throw new Error('DATABASE_URL must be a PostgreSQL connection')
  const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase()
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 16 ||
      !/[A-Z]/.test(password) || !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Valid admin email and strong password (16+ chars, upper/lower/digit/symbol) required')
  }

  // Hash before transaction; never log the password, hash or connection string.
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.$transaction(async (tx) => {
    const count = await tx.user.count()
    if (count !== 0) throw new Error('Database already has users; bootstrap refused')
    const user = await tx.user.create({
      data: {
        email, passwordHash, fullName: 'Administrador Enlace Salud',
        role: 'ADMIN', active: true,
      },
    })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'INITIAL_ADMIN_BOOTSTRAP',
        entityId: user.id,
        metadata: { source: 'operator_cli', version: 1 },
      },
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  console.log('Initial admin created and audit event recorded')
}

main()
  .catch((error) => {
    // Avoid printing raw Prisma errors, which can include connection details.
    console.error('Bootstrap refused or failed:', error.code || error.message?.split('\n')[0] || 'unknown error')
    process.exitCode = 1
  })
  .finally(async () => { await prisma.$disconnect() })
