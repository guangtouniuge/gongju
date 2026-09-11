import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'

test('账号全流程、权限与工作空间隔离', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'geoskill-auth-'))
  const listener = createServer()
  await new Promise((done) => listener.listen(0, '127.0.0.1', done))
  const port = listener.address().port
  await new Promise((done) => listener.close(done))
  const child = spawn(process.execPath, [resolve('server/geo-api-server.mjs')], { cwd: directory, env: { ...process.env, GEO_ALLOW_HEADER_IDENTITY: 'false', GEO_ALLOW_UNREGISTERED_AUTH_PROJECT: 'false', GEO_API_PORT: String(port), GEO_AUTH_DATA_DIR: join(directory, 'auth'), GEO_ADMIN_USERNAME: 'admin', GEO_ADMIN_PASSWORD: 'Safe-admin-password-1', GEO_APP_ORIGIN: 'http://localhost:5173' }, stdio: ['ignore', 'pipe', 'pipe'] })
  try {
    await new Promise((done, reject) => { child.stdout.once('data', done); child.once('error', reject); child.once('exit', (code) => reject(new Error(`server exited ${code}`))) })
    const call = async (path, body, cookie = '', extraHeaders = {}) => {
      const res = await fetch(`http://127.0.0.1:${port}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), Cookie: cookie, ...extraHeaders }, body: body === undefined ? undefined : JSON.stringify(body) })
      return { status: res.status, data: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0], headers: res.headers }
    }
    assert.equal((await call('/api/state?key=geo.projectRows')).status, 401)
    assert.equal((await call('/api/state?key=geo.projectRows', undefined, '', { 'x-geo-role': 'super_admin', 'x-geo-user-id': 'admin', 'x-geo-project-id': 'platform' })).status, 401)
    const login = await call('/api/auth/login', { username: 'admin', password: 'Safe-admin-password-1' })
    assert.equal(login.status, 200)
    assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/)
    const admin = login.cookie
    assert.equal((await call('/api/state?key=geo.projectRows', undefined, admin, { 'X-Geo-Workspace': 'stale-workspace' })).status, 409)
    assert.equal((await call('/api/auth/login', { username: 'admin', password: 'wrong' })).status, 401)
    assert.equal((await call('/api/auth/logout', {}, admin, { Origin: 'https://evil.example' })).status, 403)
    const registration = await call('/api/auth/register', { username: 'operator', password: 'Safe-operator-pass', role: 'super_admin', status: 'active' })
    assert.equal(registration.status, 201)
    assert.equal(registration.data.user.role, 'project_operator')
    assert.equal(registration.data.user.status, 'pending')
    assert.equal(registration.data.user.passwordHash, undefined)
    assert.equal((await call('/api/auth/login', { username: 'operator', password: 'Safe-operator-pass' })).status, 403)
    assert.equal((await call('/api/auth/register', { username: 'OPERATOR', password: 'Safe-operator-pass' })).status, 409)
    assert.equal((await call('/api/admin/users/update', { id: registration.data.user.id, status: 'active' }, admin)).status, 200)
    const operator = (await call('/api/auth/login', { username: 'operator', password: 'Safe-operator-pass' })).cookie
    assert.equal((await call('/api/admin/users', undefined, operator)).status, 403)
    assert.equal((await call('/api/media/publish', {}, operator)).status, 403)
    assert.equal((await call('/api/model/test', {}, operator)).status, 403)
    await call('/api/state', { key: 'geo.projectRows', value: [{ name: 'private-admin-brand' }] }, admin)
    assert.equal((await call('/api/state?key=geo.projectRows', undefined, operator)).data.value, null)
    const exported = await call('/api/articles/export', { articles: [{ title: '私有文章', body: '测试正文' }] }, admin)
    assert.equal(exported.status, 200)
    assert.equal((await call(exported.data.downloadUrl, undefined, operator)).status, 404)
    const upload = await call('/api/gallery/upload', { brand: 'private-admin-brand', files: [{ name: 'test.png', dataUrl: 'data:image/png;base64,aGVsbG8=' }] }, admin)
    assert.equal(upload.status, 200)
    assert.equal((await call(upload.data.files[0].path, undefined, operator)).status, 404)
    const agentUser = await call('/api/admin/users', { username: 'agent', password: 'Safe-agent-password', role: 'agent' }, admin)
    const agent = (await call('/api/auth/login', { username: 'agent', password: 'Safe-agent-password' })).cookie
    const emptyAgentProjects = await call('/api/projects/summary', undefined, agent)
    assert.equal(emptyAgentProjects.status, 200)
    assert.deepEqual(emptyAgentProjects.data.projects, [])
    assert.equal((await call('/api/admin/users', { username: 'escalation', password: 'Safe-agent-password', role: 'super_admin' }, agent)).status, 403)
    assert.equal((await call('/api/admin/users/update', { id: registration.data.user.id, status: 'disabled' }, agent)).status, 403)
    const managerUser = await call('/api/admin/users', { username: 'manager', password: 'Safe-manager-password', role: 'project_admin', projectName: '代理客户A' }, agent)
    assert.equal(managerUser.data.user.agentId, agentUser.data.user.agentId)
    assert.notEqual(managerUser.data.user.projectId, agentUser.data.user.agentId)
    assert.equal(managerUser.data.user.workspaceId, managerUser.data.user.projectId)
    const agentProjects = await call('/api/projects/summary', undefined, agent)
    assert.equal(agentProjects.status, 200)
    assert.equal(agentProjects.data.projects.length, 1)
    assert.equal(agentProjects.data.projects[0].projectId, managerUser.data.user.projectId)
    assert.equal(agentProjects.data.projects[0].projectName, '代理客户A')
    const manager = (await call('/api/auth/login', { username: 'manager', password: 'Safe-manager-password' })).cookie
    const teammateUser = await call('/api/admin/users', { username: 'teammate', password: 'Safe-teammate-password', role: 'project_operator' }, manager)
    assert.equal(teammateUser.status, 201)
    assert.equal(teammateUser.data.user.projectId, managerUser.data.user.projectId)
    assert.equal(teammateUser.data.user.agentId, managerUser.data.user.agentId)
    assert.equal((await call('/api/state?key=geo.projectRows', undefined, manager, { 'x-geo-project-id': registration.data.user.projectId })).status, 403)
    assert.equal((await call('/api/admin/users/update', { id: teammateUser.data.user.id, status: 'disabled' }, manager)).status, 200)
    assert.equal((await call('/api/state?key=geo.projectRows', undefined, manager)).status, 200)
    assert.equal((await call('/api/admin/users', { username: 'escalation', password: 'Safe-manager-password', role: 'agent' }, manager)).status, 403)
    assert.equal((await call('/api/admin/users/update', { id: login.data.user.id, status: 'disabled' }, admin)).status, 403)
    assert.equal((await call('/api/auth/password', { currentPassword: 'wrong', newPassword: 'New-operator-password' }, operator)).status, 400)
    assert.equal((await call('/api/auth/password', { currentPassword: 'Safe-operator-pass', newPassword: 'New-operator-password' }, operator)).status, 200)
    assert.equal((await call('/api/auth/me', undefined, operator)).status, 401)
    const newSession = (await call('/api/auth/login', { username: 'operator', password: 'New-operator-password' })).cookie
    assert.equal((await call('/api/admin/users/update', { id: registration.data.user.id, status: 'disabled' }, admin)).status, 200)
    assert.equal((await call('/api/auth/me', undefined, newSession)).status, 401)
    await call('/api/auth/logout', {}, agent)
    assert.equal((await call('/api/auth/me', undefined, agent)).status, 401)
    const stored = readFileSync(join(directory, 'auth/accounts.json'), 'utf8')
    assert.ok(!stored.includes('Safe-admin-password-1'))
    assert.ok(!stored.includes(admin.split('=')[1]))
  } finally {
    child.kill()
    await new Promise((done) => child.exitCode !== null ? done() : child.once('exit', done))
    rmSync(directory, { recursive: true, force: true })
  }
})
