import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ admin: vi.fn(), transaction: vi.fn(), review: vi.fn(), updateReview: vi.fn(), userUpdate: vi.fn(), userFind: vi.fn(), relation: vi.fn(), sessions: vi.fn(), audit: vi.fn() }))
vi.mock('@/lib/admin-session', () => ({ requireActiveAdmin: m.admin }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: m.transaction } }))
import { reviewIdentity } from '../app/dashboard/admin/identity/actions'
function data(decision: string) { const d = new FormData(); d.set('decision', decision); d.set('reason','Identity checked with the user by Admin'); d.set('contacted','on'); d.set('existingId','existing'); return d }
beforeEach(() => {
  vi.resetAllMocks(); m.admin.mockResolvedValue({id:'admin'}); m.review.mockResolvedValue({ userId:'held', status:'PENDING', candidateIds:['existing'], doctorId:'doctor', user:{identityStatus:'HOLD'} }); m.updateReview.mockResolvedValue({count:1}); m.userFind.mockResolvedValue({id:'doctor'})
  m.transaction.mockImplementation(async fn => fn({ identityReview:{findUnique:m.review,updateMany:m.updateReview}, user:{update:m.userUpdate,findFirst:m.userFind},doctorPatient:{upsert:m.relation},session:{deleteMany:m.sessions},auditLog:{create:m.audit} }))
})
it('requires Admin before reading identity candidates or mutating', async () => { m.admin.mockRejectedValue(new Error('denied')); await expect(reviewIdentity('review',{},data('DISTINCT'))).rejects.toThrow(); expect(m.transaction).not.toHaveBeenCalled() })
it('requires human validation and explanation', async () => { const d=data('DISTINCT'); d.delete('contacted'); expect((await reviewIdentity('review',{},d)).error).toBeTruthy(); expect(m.transaction).not.toHaveBeenCalled() })
it('releases distinct person and grants only originally requested clinic relation, with audit', async () => { expect((await reviewIdentity('review',{},data('DISTINCT'))).success).toBeTruthy(); expect(m.userUpdate).toHaveBeenCalledWith({where:{id:'held'},data:{identityStatus:'CLEAR',active:true}}); expect(m.relation).toHaveBeenCalledWith(expect.objectContaining({create:{doctorId:'doctor',patientId:'held'}})); expect(m.audit).toHaveBeenCalled() })
it('duplicate remains blocked without merging records or granting existing account access', async () => { expect((await reviewIdentity('review',{},data('DUPLICATE'))).success).toBeTruthy(); expect(m.userUpdate).toHaveBeenCalledWith({where:{id:'held'},data:{identityStatus:'DUPLICATE',active:false}}); expect(m.relation).not.toHaveBeenCalled() })
it('rejects stale reviews and unrelated existing record selections', async () => { const d=data('DUPLICATE'); d.set('existingId','unrelated'); expect((await reviewIdentity('review',{},d)).error).toBeTruthy(); expect(m.userUpdate).not.toHaveBeenCalled(); m.review.mockResolvedValue({status:'DISTINCT'}); expect((await reviewIdentity('review',{},data('DISTINCT'))).error).toBeTruthy() })
