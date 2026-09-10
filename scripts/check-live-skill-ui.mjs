import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
await page.addInitScript(() => {
  const project = { name: '界面验收测试', brand: '测试公司', recommendWord: '测试品牌', coreKeyword: '西安GEO公司', industry: 'GEO', city: '西安', keywords: '1', assets: '1', status: '已配置' }
  localStorage.setItem('geo.projectRows', JSON.stringify([project]))
  localStorage.setItem('geo.keywordRows', JSON.stringify([[project.name, project.coreKeyword]]))
  localStorage.setItem('geo.knowledgeRows', JSON.stringify([[project.name, '测试知识库']]))
})
await page.goto('https://geoskill.7chacha.com', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: '创建生成任务', exact: true }).first().click()
await page.getByText('当前品牌资料已就绪', { exact: false }).waitFor()
await page.getByRole('button', { name: '创建生成任务', exact: true }).first().click()
await page.getByRole('button', { name: '榜单推荐', exact: true }).click()
assert.equal(await page.locator('.type-chip.active').count(), 0)
await page.getByRole('button', { name: '技术解析', exact: true }).click()
assert.equal(await page.locator('.type-chip.active').count(), 1)
await page.getByText('写作场景', { exact: true }).locator('..').locator('select').selectOption('按实际场景写')
console.log((await page.locator('body').innerText()).slice(-2600))
await page.screenshot({ path: 'outputs/api-tests/skill-online-ui.png', fullPage: true })
console.log(JSON.stringify({ errors }))
await browser.close()
