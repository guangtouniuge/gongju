import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
try {
  // Viewing must not let the legacy client's autosave alter project records.
  await page.route('**/api/state', route => route.request().method() === 'POST' ? route.fulfill({ json: { ok: true } }) : route.continue())
  await page.goto('https://geoskill.7chacha.com', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '查看文章库', exact: true }).click()
  await page.getByRole('button', { name: '全文查看', exact: true }).first().click()
  const article = page.locator('.article-reader .article-formatted-block')
  await article.waitFor()
  assert.ok(await article.locator('h1,h2,h3,h4').count() > 0)
  assert.ok(await article.locator('strong').count() > 0)
  assert.ok(!/^#{1,6}\s/m.test(await article.innerText()))
  assert.ok(!(await article.innerText()).includes('**'))
  await fs.mkdir('outputs/api-tests/batch-topics-online', { recursive: true })
  await page.screenshot({ path: 'outputs/api-tests/batch-topics-online/reader.png' })
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载本文', exact: true }).click()
  const download = await downloadEvent
  const path = 'outputs/api-tests/batch-topics-online/download.doc'
  await download.saveAs(path)
  const doc = await fs.readFile(path, 'utf8')
  assert.ok(doc.includes('<strong>'))
  assert.ok(/<h[1-6]>/.test(doc))
  assert.ok(!/^#{1,6}\s/m.test(doc))
  assert.ok(!doc.includes('**'))
  assert.deepEqual(errors, [])
  console.log('Live preview and downloaded Word: headings, emphasis rendered; no raw Markdown markers; no page errors.')
} finally { await browser.close() }
