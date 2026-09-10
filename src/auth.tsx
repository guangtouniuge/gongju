import { useEffect, useState, type ReactNode, type FormEvent } from 'react'
import './auth.css'

type User = {
  id: string
  username: string
  displayName: string
  role: string
  status: string
  workspaceId: string
  agentId?: string
  projectId?: string
  projectName?: string
  parentId?: string
  permissions: string[]
}
const labels: Record<string, string> = { super_admin: '总后台管理员', agent: '代理商', project_admin: '项目管理员', project_operator: '项目操作员' }
let scope = ''
export const accountStorage = {
  workspaceId: () => scope,
  getItem: (key: string) => window.localStorage.getItem(`account:${scope}:${key}`),
  setItem: (key: string, value: string) => window.localStorage.setItem(`account:${scope}:${key}`, value),
}
async function request(path: string, body?: unknown) {
  const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || '请求失败')
  return result
}
export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [register, setRegister] = useState(false)
  const [panel, setPanel] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const accept = (next: User | null) => {
    scope = next?.projectId || next?.workspaceId || ''
    window.__geoIdentity = next ? {
      userId: next.id,
      role: next.role as 'super_admin' | 'agent' | 'project_admin' | 'project_operator',
      agentId: next.agentId || '',
      projectId: next.projectId || next.workspaceId,
    } : undefined
    window.dispatchEvent(new Event('geo:identity-changed'))
    setUser(next)
  }
  useEffect(() => {
    if (window.__geoIdentity) {
      const identity = window.__geoIdentity
      setUser({
        id: identity.userId,
        username: identity.userId,
        displayName: identity.userId,
        role: identity.role,
        status: 'active',
        workspaceId: identity.projectId,
        agentId: identity.agentId || '',
        projectId: identity.projectId,
        permissions: identity.role === 'super_admin'
          ? ['users:manage', 'system:manage', 'media:publish']
          : identity.role === 'project_operator'
            ? []
            : ['users:manage'],
      })
      scope = identity.projectId
      setLoading(false)
      return
    }
    request('/api/auth/me').then((r) => accept(r.user)).catch(() => accept(null)).finally(() => setLoading(false))
    const expired = () => { accept(null); setMessage('登录已失效，请重新登录') }
    window.addEventListener('geo-auth-expired', expired)
    return () => window.removeEventListener('geo-auth-expired', expired)
  }, [])
  useEffect(() => {
    if (!user) return
    const recheck = () => { void request('/api/auth/me').then((r) => {
      if (r.user.id !== user.id) { window.location.reload(); return }
      accept(r.user)
    }).catch(() => { accept(null); setMessage('请重新登录') }) }
    const timer = window.setInterval(recheck, 60_000)
    window.addEventListener('focus', recheck)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', recheck) }
  }, [user?.id])
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setMessage('')
    try { await action() } catch (error) { setMessage(error instanceof Error ? error.message : '操作失败') } finally { setBusy(false) }
  }
  const submit = (event: FormEvent<HTMLFormElement>, action: (data: Record<string, string>) => Promise<void>) => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>
    void run(() => action(data))
  }
  if (loading) return <div className="auth-screen">正在确认登录状态…</div>
  if (!user) return <div className="auth-screen"><form className="auth-card" onSubmit={(e) => submit(e, async (data) => {
    const result = await request(`/api/auth/${register ? 'register' : 'login'}`, data)
    if (register) { setMessage(result.message); setRegister(false) } else { window.location.reload() }
  })}><h1>geoskill</h1><h2>{register ? '注册账号' : '登录内容生产系统'}</h2><label>账号<input name="username" required minLength={3} maxLength={80} autoComplete="username" /></label><label>密码<input name="password" type="password" required minLength={10} maxLength={128} autoComplete={register ? 'new-password' : 'current-password'} /></label><p role="status">{message}</p><button disabled={busy}>{register ? '提交注册' : '登录'}</button><button type="button" onClick={() => { setRegister(!register); setMessage('') }}>{register ? '返回登录' : '注册新账号'}</button></form></div>
  const accountEntry = user.role === 'super_admin' ? '代理管理' : user.role === 'agent' ? '项目账户' : ''
  return <><div className="account-bar"><span>{user.displayName} · {labels[user.role]}</span>{accountEntry && <span className="account-hint">账号管理请使用左侧「{accountEntry}」</span>}<button onClick={() => { setPanel(panel === 'password' ? '' : 'password'); setMessage('') }}>修改密码</button><button disabled={busy} onClick={() => void run(async () => { await request('/api/auth/logout', {}); accept(null) })}>退出登录</button></div>
    {panel && <section className="account-panel"><button onClick={() => setPanel('')}>关闭</button><p role="status">{message}</p>
      {panel === 'password' && <form onSubmit={(e) => submit(e, async (data) => { await request('/api/auth/password', data); accept(null); setMessage('密码已修改，请重新登录') })}><h2>修改密码</h2><label>原密码<input name="currentPassword" type="password" required autoComplete="current-password" /></label><label>新密码<input name="newPassword" type="password" required minLength={10} maxLength={128} autoComplete="new-password" /></label><button disabled={busy}>保存密码</button></form>}
    </section>}{!panel && <div key={user.id}>{children}</div>}</>
}
