import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ allow:vi.fn(), hash:vi.fn(), candidates:vi.fn(), create:vi.fn(), review:vi.fn(), audit:vi.fn(), tx:vi.fn(), exists:vi.fn(), session:vi.fn(), clear:vi.fn() }))
vi.mock('@/lib/prisma',()=>({prisma:{user:{findUnique:m.exists},$transaction:m.tx}}))
vi.mock('@/lib/auth',()=>({hashPassword:m.hash,setSession:m.session,clearSession:m.clear}))
vi.mock('@/lib/rate-limit',()=>({allowAttempt:m.allow}))
vi.mock('next/navigation',()=>({redirect:(path:string)=>{throw new Error('REDIRECT:'+path)}}))
import { signup } from '../app/signup/actions'
function form() { const d=new FormData(); for(const [k,v] of Object.entries({fullName:'Paciente Prueba',email:'dummy@example.test',password:'StrongTest!123456',dateOfBirth:'2000-01-01',contactPhone:'7875551234'})) d.set(k,v); return d }
beforeEach(()=>{vi.resetAllMocks();m.allow.mockResolvedValue(true);m.hash.mockResolvedValue("hash");m.exists.mockResolvedValue(null);m.candidates.mockResolvedValue([]);m.create.mockImplementation(({data})=>Promise.resolve({id:'new',...data}));m.tx.mockImplementation(async fn=>fn({user:{findMany:m.candidates,create:m.create},identityReview:{create:m.review},auditLog:{create:m.audit}}))})
it('matching identity creates inactive held account, queues Admin review and does not create a session', async()=>{m.candidates.mockResolvedValue([{id:'existing',fullName:'Paciente Prueba',contactPhone:null}]);await expect(signup(null,form())).rejects.toThrow('REDIRECT:/signup/pending');expect(m.review).toHaveBeenCalled();expect(m.session).not.toHaveBeenCalled();expect(m.create).toHaveBeenCalledWith({data:expect.objectContaining({identityStatus:'HOLD',active:false})})})
it('new identity keeps standard registration and session flow',async()=>{await expect(signup(null,form())).rejects.toThrow('REDIRECT:/signup/success');expect(m.review).not.toHaveBeenCalled();expect(m.session).toHaveBeenCalledWith('new')})
it('missing birth or invalid contact cannot bypass screening',async()=>{const d=form();d.delete('dateOfBirth');expect((await signup(null,d))?.error).toBeTruthy();expect(m.tx).not.toHaveBeenCalled()})
