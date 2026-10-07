import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'

// A database counter works across Vercel instances. No email or IP is stored in clear text.
export async function allowAttempt(scope: string, subject: string, limit = 5, windowMs = 15 * 60 * 1000) {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs
  const id = createHash('sha256').update(`${scope}:${subject}:${windowStart}`).digest('hex')
  const expiresAt = new Date(windowStart + windowMs)
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "SecurityRateLimit" ("id", "count", "expiresAt") VALUES (${id}, 1, ${expiresAt})
    ON CONFLICT ("id") DO UPDATE SET "count" = "SecurityRateLimit"."count" + 1
    RETURNING "count"
  `
  return rows[0].count <= limit
}
