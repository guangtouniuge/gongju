import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
const users = []
await mkdir('output', { recursive: true })
page.on('pageerror', error => { errors.push(error.message); console.log(error.message) })
// Isolated UI check: no shared project storage or generation calls.
await page.addInitScript(() => { window.__geoIdentity = { userId: 'console-admin', role: 'super_admin', projectId: 'platform' } })
await page.route('**/api/**', async route => {
  const request = route.request()
  const url = new URL(request.url())
  if (url.pathname === '/api/admin/users' && request.method() === 'GET') {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, users }) })
  }
  if (url.pathname === '/api/admin/users' && request.method() === 'POST') {
    const body = request.postDataJSON()
    users.push({ id: `u-${users.length + 1}`, username: body.username, displayName: body.displayName || body.username, role: body.role, status: 'active', workspaceId: body.workspaceId || `workspace-${users.length + 1}` })
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, user: users.at(-1) }) })
  }
  if (url.pathname === '/api/admin/users/update' && request.method() === 'POST') {
    const body = request.postDataJSON()
    const user = users.find(row => row.id === body.id)
    if (user) Object.assign(user, body)
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user }) })
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"value":null}' })
})
  const base = process.env.CONSOLE_TEST_URL || 'http://127.0.0.1:5173/gongju/'
try {
  await page.goto(`${base}#/platform/agencies`)
  await page.getByRole('button', { name: '添加代理账号', exact: true }).click()
  await page.getByLabel('登录账号', { exact: true }).fill('ui-agent')
  await page.getByLabel('显示名称', { exact: true }).fill('UI验收代理')
  await page.getByLabel('初始密码', { exact: true }).fill('Safe-ui-agent-password')
  await page.getByRole('button', { name: '保存账号', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: '停用', exact: true }).click()
  await page.getByRole('button', { name: '启用', exact: true }).waitFor()
  await page.getByLabel('全选当前列表').check()
  await page.getByRole('button', { name: '取消选择' }).click()
  await page.getByText('UI验收代理').waitFor()
  await page.getByLabel('后台入口', { exact: true }).selectOption('agency')
  await page.getByRole('button', { name: '查看项目' }).click()
  await page.getByRole('button', { name: '添加品牌', exact: true }).click()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await page.getByRole('button', { name: '添加品牌', exact: true }).click()
  await page.getByLabel('项目名称', { exact: true }).fill('UI验收品牌')
  await page.getByLabel('推荐名称', { exact: true }).fill('UI验收推荐名')
  await page.getByLabel('行业', { exact: true }).fill('企业服务')
  await page.getByRole('button', { name: '确定', exact: true }).click()
  await page.getByRole('button', { name: '进入', exact: true }).click()
  assert.match(page.url(), /project\/keywords$/)
  assert.equal(await page.getByLabel('当前品牌', { exact: true }).inputValue(), 'UI验收品牌')
  await page.getByLabel('后台入口', { exact: true }).selectOption('project')
  await page.getByRole('button', { name: '品牌文章系统', exact: true }).click()
  await page.getByRole('button', { name: '文章审核', exact: true }).click()
  assert.match(page.url(), /project\/audit$/)
  await page.reload()
  await page.getByRole('button', { name: '文章审核', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: '文章审核', exact: true }).getAttribute('aria-current'), 'page')
  await page.goBack()
  assert.match(page.url(), /project\/tasks$/)
  await page.goto(`${base}#/platform/agencies`)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  await page.screenshot({ path: 'output/console-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 1024, height: 768 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  assert.deepEqual(errors, [])
  console.log('PASS: three entrances, routing/history, validation, persistence, editing, filtering, bulk deletion, brand modal, audit navigation, layout, no runtime errors')
} catch (error) { console.log(await page.locator('body').innerText()); console.log(page.url()); await page.screenshot({ path: 'output/console-failure.png', fullPage: true }); throw error } finally { await browser.close() }
