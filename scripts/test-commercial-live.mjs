import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const credentials = JSON.parse(await fs.readFile('.tmp/commercial-credentials.json', 'utf8'))
const base = 'https://geoskill.7chacha.com'
const out = 'outputs/commercial-acceptance'
await fs.mkdir(out, { recursive: true })
async function api(route, body, cookie = '', headers = {}) {
  const response = await fetch(base + route, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
  const data = await response.json()
  return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0] }
}
for (const route of ['/api/state?key=geo.projectRows', '/api/config/status', '/api/jobs/status?id=JOB-test', '/api/gallery/file?file=unknown']) assert.equal((await api(route)).status, 401)
assert.equal((await api('/api/state?key=geo.projectRows', undefined, '', { 'x-geo-role': 'super_admin', 'x-geo-user-id': 'admin', 'x-geo-project-id': 'exposure-main' })).status, 401)
const admin = (await api('/api/auth/login', credentials.admin)).cookie
const project = (await api('/api/auth/login', credentials.project)).cookie
assert.ok(admin && project)
const articles = (await api('/api/state?key=geo.articleRows', undefined, project)).data.value
assert.ok(articles.length >= 26)
assert.equal((await api('/api/config/status', undefined, project)).status, 403)
assert.equal((await api('/api/state?key=geo.projectRows', undefined, project, { 'x-geo-project-id': 'platform' })).status, 403)
const ids = []
try {
  const suffix = Date.now().toString(36)
  const password = credentials.project.password
  async function create(role, username, cookie) {
    const result = await api('/api/admin/users', { role, username, password, displayName: '验收测试账号', projectName: '验收隔离测试' }, cookie)
    assert.equal(result.status, 201)
    ids.push(result.data.user.id)
    const login = await api('/api/auth/login', { username, password })
    assert.equal(login.status, 200)
    return { user: result.data.user, cookie: login.cookie }
  }
  const agency = await create('agent', `qa-agent-${suffix}`, admin)
  const a = await create('project_admin', `qa-a-${suffix}`, agency.cookie)
  const b = await create('project_admin', `qa-b-${suffix}`, agency.cookie)
  const operator = await create('project_operator', `qa-op-${suffix}`, a.cookie)
  assert.equal((await api('/api/state', { key: 'geo.projectRows', value: [{ name: '隔离验收A', coreKeyword: '测试词' }] }, a.cookie)).status, 200)
  assert.equal((await api('/api/state?key=geo.projectRows', undefined, b.cookie, { 'x-geo-project-id': a.user.projectId })).status, 403)
  assert.equal((await api('/api/admin/users', undefined, operator.cookie)).status, 403)
  assert.equal((await api('/api/admin/users/update', { id: operator.user.id, status: 'disabled' }, a.cookie)).status, 200)
  assert.equal((await api('/api/auth/me', undefined, operator.cookie)).status, 401)
  assert.equal((await api('/api/state?key=geo.projectRows', undefined, a.cookie)).status, 200)
  assert.equal((await api('/api/state?key=geo.projectRows', undefined, agency.cookie, { 'x-geo-project-id': 'exposure-main' })).status, 403)
} finally {
  for (const id of ids.reverse()) await api('/api/admin/users/update', { id, status: 'disabled' }, admin)
}
console.log('PASS: anonymous and forged access rejected; real agent/project/operator isolation; disabled sessions revoked; migrated articles retained.')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(base)
  await page.locator('input[name=username]').fill(credentials.project.username)
  await page.locator('input[name=password]').fill(credentials.project.password)
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await page.getByRole('button', { name: '退出登录', exact: true }).waitFor()
  await page.getByLabel('当前品牌', { exact: true }).selectOption({ label: '曝光率GEO' })
  await page.goto(base + '/#/project/library')
  await page.getByRole('button', { name: '全文查看', exact: true }).first().click()
  const article = page.locator('.article-reader')
  await article.waitFor()
  assert.ok(await article.locator('h2,h3').count() > 0)
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('.article-reader img')]
    return images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0)
  })
  await page.screenshot({ path: out + '/authenticated-reader.png' })
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载本文', exact: true }).click()
  const download = await downloadPromise
  await download.saveAs(out + '/authenticated-article.doc')
  assert.ok((await fs.stat(out + '/authenticated-article.doc')).size > 1000)
  assert.deepEqual(errors, [])
  console.log('PASS: real browser login, article rendering and authenticated Word download.')
} catch (error) {
  const page = browser.contexts()[0]?.pages()[0]
  if (page) {
    await page.screenshot({ path: out + '/browser-failure.png', fullPage: true })
    await fs.writeFile(out + '/browser-failure.txt', await page.locator('body').innerText())
  }
  throw error
} finally { await browser.close() }
await fs.mkdir('outputs/private', { recursive: true })
await fs.writeFile('outputs/private/geoskill-login.txt', `网站：https://geoskill.7chacha.com\n\n总后台账号：${credentials.admin.username}\n密码：${credentials.admin.password}\n\n曝光率项目账号：${credentials.project.username}\n密码：${credentials.project.password}\n\n登录后可在右上角修改密码。请勿公开或转发此文件。\n`, { mode: 0o600 })
