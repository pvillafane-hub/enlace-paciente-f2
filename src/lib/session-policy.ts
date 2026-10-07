type SessionState = { userId: string | null; createdAt: Date; expiresAt: Date }
type UserState = { active: boolean; passwordChangedAt: Date | null }

export function isSessionUsable(session: SessionState | null, user: UserState | null, now = new Date()): boolean {
  return Boolean(session?.userId && user?.active && session.expiresAt > now && now.getTime() - session.createdAt.getTime() < 30 * 24 * 60 * 60 * 1000 &&
    (!user.passwordChangedAt || session.createdAt > user.passwordChangedAt))
}
