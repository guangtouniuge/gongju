import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import { AsyncLocalStorage } from 'node:async_hooks'

export const requestAccount = new AsyncLocalStorage()
export const workspacePath = (...parts) => {
  const user = requestAccount.getStore()
  if (!user) throw new Error('缺少账号上下文')
  return resolve(process.cwd(), 'outputs', 'workspaces', user.workspaceId, ...parts)
}
export const roles = {
  super_admin: ['users:manage', 'system:manage', 'content:write', 'media:publish'],
  agent: ['users:manage', 'content:write', 'media:publish'],
  project_admin: ['users:manage', 'content:write', 'media:publish'],
  project_operator: ['content:write'],
}
const fail = (status, message) => { throw Object.assign(new Error(message), { status }) }
const digest = (token) => createHash('sha256').update(token).digest('hex')
const idPart = (value, fallback = randomUUID()) => {
  const text = String(value || '').trim()
  if (!text) return fallback
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(text)) fail(400, '项目或代理编号只能使用字母、数字、横线和下划线')
  return text
}
const hashPassword = (password) => {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) fail(400, '密码需为10至128个字符')
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}
const verify = (password, hash) => {
  if (typeof password !== 'string' || password.length > 128) return false
  const [salt, key] = hash.split(':')
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(key, 'hex'))
}
const normalizeUser = (user) => {
  if (!user) return user
  if (user.role === 'super_admin') {
    user.workspaceId ||= user.projectId || 'platform'
    user.agentId ||= ''
    user.projectId ||= user.workspaceId
  } else if (user.role === 'agent') {
    user.agentId ||= user.workspaceId || user.id
    user.workspaceId ||= user.agentId
    user.projectId ||= ''
  } else {
    user.projectId ||= user.workspaceId || user.id
    user.workspaceId ||= user.projectId
    user.agentId ||= user.parentWorkspaceId || ''
  }
  user.projectName ||= user.role === 'agent' ? `${user.displayName || user.username}代理空间` : `${user.displayName || user.username}项目`
  return user
}
const publicUser = ({ passwordHash, ...user }) => ({ ...normalizeUser(user), permissions: roles[user.role] })

export function createAuth({ json, readJson }) {
  const directory = resolve(process.env.GEO_AUTH_DATA_DIR || 'outputs/auth')
  mkdirSync(directory, { recursive: true })
  const file = resolve(directory, 'accounts.json')
  const db = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { version: 1, users: [], sessions: [] }
  db.users.forEach(normalizeUser)
  const projectRegistryFile = resolve(process.cwd(), 'outputs/data/project-accounts.json')
  const readProjectRegistry = () => {
    if (!existsSync(projectRegistryFile)) return []
    try {
      const rows = JSON.parse(readFileSync(projectRegistryFile, 'utf8'))
      return Array.isArray(rows) ? rows : []
    } catch {
      return []
    }
  }
  const writeProjectRegistry = (rows) => {
    mkdirSync(resolve(process.cwd(), 'outputs/data'), { recursive: true })
    writeFileSync(`${projectRegistryFile}.tmp`, JSON.stringify(rows, null, 2), 'utf8')
    renameSync(`${projectRegistryFile}.tmp`, projectRegistryFile)
  }
  const syncProjectRegistry = (user) => {
    normalizeUser(user)
    if (!['project_admin', 'project_operator'].includes(user.role) || !user.projectId) return
    const rows = readProjectRegistry()
    const existing = rows.find((row) => row.projectId === user.projectId)
    const now = new Date().toISOString()
    const next = {
      projectId: user.projectId,
      agentId: user.agentId || '',
      projectName: user.projectName || user.displayName || user.username,
      status: user.status === 'disabled' ? 'DISABLED' : 'ACTIVE',
      ownerUserId: user.id,
      createdAt: existing?.createdAt || user.createdAt || now,
      updatedAt: now,
    }
    if (existing) Object.assign(existing, next)
    else rows.push(next)
    writeProjectRegistry(rows)
  }
  const save = () => {
    writeFileSync(`${file}.tmp`, JSON.stringify(db, null, 2), { mode: 0o600 })
    renameSync(`${file}.tmp`, file)
  }
  const accountScope = (body, role, actor) => {
    if (role === 'super_admin') return { workspaceId: 'platform', agentId: '', projectId: 'platform', parentId: '', projectName: '总后台' }
    if (role === 'agent') {
      const agentId = idPart(body.agentId || body.workspaceId)
      return { workspaceId: agentId, agentId, projectId: '', parentId: actor?.id || '', projectName: String(body.projectName || body.displayName || body.username || '代理空间').slice(0, 80) }
    }
    const actorScope = actor ? normalizeUser(actor) : null
    const projectId = role === 'project_operator' && actorScope?.role === 'project_admin'
      ? actorScope.projectId
      : idPart(body.projectId || body.workspaceId)
    const agentId = actorScope?.role === 'agent'
      ? actorScope.agentId
      : actorScope?.role === 'project_admin'
        ? actorScope.agentId
        : idPart(body.agentId || actorScope?.agentId || '', '')
    return {
      workspaceId: projectId,
      agentId,
      projectId,
      parentId: actor?.id || '',
      projectName: String(body.projectName || body.displayName || body.username || '客户项目').slice(0, 80),
    }
  }
  const createUser = (body, role, status, scope = accountScope(body, role)) => {
    const username = String(body.username || '').trim().toLowerCase()
    if (!/^[a-z0-9][a-z0-9_.@-]{2,79}$/.test(username)) fail(400, '账号需为3至80位字母、数字或邮箱格式')
    if (db.users.some((u) => u.username === username)) fail(409, '账号已存在')
    const user = normalizeUser({ id: randomUUID(), username, displayName: String(body.displayName || username).slice(0, 80), passwordHash: hashPassword(body.password), role, status, ...scope, createdAt: new Date().toISOString() })
    db.users.push(user)
    save()
    syncProjectRegistry(user)
    return user
  }
  if (!db.users.some((u) => u.role === 'super_admin') && process.env.GEO_ADMIN_USERNAME && process.env.GEO_ADMIN_PASSWORD) {
    createUser({ username: process.env.GEO_ADMIN_USERNAME, password: process.env.GEO_ADMIN_PASSWORD }, 'super_admin', 'active')
  }
  const cookie = (req) => String(req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith('geo_session='))?.slice(12) || ''
  const setCookie = (res, token, maxAge) => res.setHeader('Set-Cookie', `geo_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.GEO_COOKIE_SECURE === 'true' ? '; Secure' : ''}`)
  const authenticate = (req) => {
    const session = db.sessions.find((s) => s.tokenHash === digest(cookie(req)) && s.expiresAt > Date.now())
    const user = session && db.users.find((u) => u.id === session.userId && u.status === 'active')
    if (!user) fail(401, '请先登录，或联系管理员确认账号状态')
    return user
  }
  const canManage = (actor, target) => {
    normalizeUser(actor); normalizeUser(target)
    if (actor.role === 'super_admin') return target.role !== 'super_admin' || actor.id === target.id
    if (actor.role === 'agent') return target.agentId === actor.agentId && ['project_admin', 'project_operator'].includes(target.role)
    if (actor.role === 'project_admin') return target.projectId === actor.projectId && target.role === 'project_operator'
    return false
  }
  const creatableRoles = (actor) => {
    if (actor.role === 'super_admin') return ['agent', 'project_admin', 'project_operator']
    if (actor.role === 'agent') return ['project_admin', 'project_operator']
    if (actor.role === 'project_admin') return ['project_operator']
    return []
  }
  const attempts = new Map()
  const rateLimit = (req) => {
    const key = req.socket.remoteAddress
    const now = Date.now()
    for (const [ip, item] of attempts) if (item.until < now) attempts.delete(ip)
    const item = attempts.get(key) || { count: 0, until: now + 15 * 60_000 }
    if (++item.count > 30) fail(429, '尝试过于频繁，请15分钟后重试')
    attempts.set(key, item)
  }
  const checkOrigin = (req) => {
    if (req.method === 'GET' || req.method === 'OPTIONS') return
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) fail(415, '需要JSON请求')
    if (req.headers.origin) {
      const allowed = process.env.GEO_APP_ORIGIN || `http://${req.headers.host}`
      if (req.headers.origin !== allowed) fail(403, '请求来源不允许')
    }
  }
  const handle = async (req, res, path) => {
    if (!path.startsWith('/api/auth/') && !path.startsWith('/api/admin/')) return false
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'POST' && path === '/api/auth/register') {
      rateLimit(req)
      const user = createUser(await readJson(req), 'project_operator', 'pending')
      json(res, 201, { ok: true, user: publicUser(user), message: '注册成功，请等待管理员审核' }); return true
    }
    if (req.method === 'POST' && path === '/api/auth/login') {
      rateLimit(req)
      const body = await readJson(req)
      const user = db.users.find((u) => u.username === String(body.username || '').trim().toLowerCase())
      if (!user || !verify(body.password, user.passwordHash)) fail(401, '账号或密码错误')
      if (user.status !== 'active') fail(403, '账号待审核或已停用，请联系管理员')
      const token = randomBytes(32).toString('hex')
      db.sessions = db.sessions.filter((s) => s.expiresAt > Date.now())
      db.sessions.push({ tokenHash: digest(token), userId: user.id, expiresAt: Date.now() + 8 * 3600_000 })
      save(); setCookie(res, token, 8 * 3600)
      json(res, 200, { ok: true, user: publicUser(user) }); return true
    }
    if (req.method === 'POST' && path === '/api/auth/logout') {
      db.sessions = db.sessions.filter((s) => s.tokenHash !== digest(cookie(req)))
      save(); setCookie(res, '', 0); json(res, 200, { ok: true }); return true
    }
    const actor = authenticate(req)
    if (req.method === 'GET' && path === '/api/auth/me') { json(res, 200, { ok: true, user: publicUser(actor) }); return true }
    if (req.method === 'POST' && path === '/api/auth/password') {
      const body = await readJson(req)
      rateLimit(req)
      if (!verify(body.currentPassword, actor.passwordHash)) fail(400, '原密码错误')
      actor.passwordHash = hashPassword(body.newPassword)
      db.sessions = db.sessions.filter((s) => s.userId !== actor.id)
      save(); setCookie(res, '', 0); json(res, 200, { ok: true }); return true
    }
    if (!roles[actor.role].includes('users:manage')) fail(403, '无账号管理权限')
    if (req.method === 'GET' && path === '/api/admin/users') {
      json(res, 200, { ok: true, users: db.users.filter((u) => canManage(actor, u)).map(publicUser) }); return true
    }
    if (req.method === 'POST' && path === '/api/admin/users') {
      const body = await readJson(req)
      const target = { ...accountScope(body, body.role || 'project_operator', actor), role: body.role || 'project_operator' }
      normalizeUser(target)
      if (!roles[target.role] || !creatableRoles(actor).includes(target.role) || !canManage(actor, target)) fail(403, '不能创建此角色或项目账号')
      const user = createUser(body, target.role, 'active', target)
      json(res, 201, { ok: true, user: publicUser(user) }); return true
    }
    if (req.method === 'POST' && path === '/api/admin/users/update') {
      const body = await readJson(req)
      const target = db.users.find((u) => u.id === body.id)
      if (!target) fail(404, '账号不存在')
      const next = { ...target, role: body.role ?? target.role, status: body.status ?? target.status }
      if (actor.id === target.id || !roles[next.role] || !['pending', 'active', 'disabled'].includes(next.status) || !canManage(actor, target) || !canManage(actor, next)) fail(403, '不允许此账号变更')
      if (target.role === 'super_admin' && target.status === 'active' && (next.role !== 'super_admin' || next.status !== 'active') && db.users.filter((u) => u.role === 'super_admin' && u.status === 'active').length <= 1) fail(409, '必须保留一个有效总后台管理员')
      Object.assign(target, { role: next.role, status: next.status })
      db.sessions = db.sessions.filter((s) => s.userId !== target.id)
      save(); syncProjectRegistry(target); json(res, 200, { ok: true, user: publicUser(target) }); return true
    }
    fail(404, '接口不存在')
  }
  return { handle, authenticate, checkOrigin }
}
