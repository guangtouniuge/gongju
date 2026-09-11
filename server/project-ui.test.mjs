import test from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

test('browser: view, edit, insert own image, download and switch project without stale content', async () => {
  const vite = await createServer({ configFile: false, base: '/', plugins: [react()], server: { host: '127.0.0.1', port: 0 } })
  await vite.listen()
  const browser = await chromium.launch({ channel: process.env.GEO_TEST_BROWSER || 'chrome', headless: true })
  try {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const imageUrl = '/api/gallery/file?file=own-a.png'
    const brand = { name: '品牌一', brand: '品牌一', recommendWord: '推荐', coreKeyword: '核心词', industry: '服务', city: '西安', keywords: '', assets: '', status: '新建' }
    const article = { id: 'article-a', project: '品牌一', title: '项目A的文章', keyword: '核心词', body: '项目A的正文', status: '已生成', words: '6' }
    const stores = {
      a: { 'geo.projectRows': [brand, { ...brand, name: '品牌二' }], 'geo.activeBrand': '品牌一', 'geo.articleRows': [article, { ...article, id: 'other-brand', project: '品牌二', title: '其他品牌的文章' }], 'geo.galleryRows': [['品牌一', '场景', '', '', '', imageUrl, '自己的图片'], ['品牌二', '场景', '', '', '', '/api/gallery/file?file=other.png', '其他品牌图片']] },
      b: { 'geo.projectRows': [brand], 'geo.activeBrand': '品牌一', 'geo.articleRows': [{ ...article, id: 'article-b', title: '项目B的文章', body: '项目B的正文' }] },
    }
    stores.a['geo.keywordLibraryRows'] = [['品牌一', '核心词', 'A'], ['品牌二', '核心词', 'B']]
    stores.a['geo.taskRows'] = [{ project: '品牌二', name: '任务提到品牌一及核心词' }]
    await page.addInitScript(() => { window.__geoIdentity = { userId: 'user-a', role: 'project_admin', projectId: 'a' } })
    let retryArticleLoad = false
    await page.route('**/api/**', async route => {
      const request = route.request()
      const id = request.headers()['x-geo-project-id']
      assert.ok(['a', 'b'].includes(id), 'every API call must carry selected project identity')
      const url = new URL(request.url())
      if (url.pathname === '/api/state') {
        if (request.method() === 'POST') {
          const { key, value } = request.postDataJSON()
          stores[id][key] = value
          return route.fulfill({ json: { ok: true, value } })
        }
        if (id === 'a' && url.searchParams.get('key') === 'geo.articleRows') {
          if (!retryArticleLoad) return route.fulfill({ status: 503, json: { ok: false, error: 'temporary load failure' } })
          await new Promise(resolve => setTimeout(resolve, 6100))
        }
        return route.fulfill({ json: { ok: true, value: stores[id][url.searchParams.get('key')] ?? null } })
      }
      if (url.pathname === '/api/gallery/file') return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP9sAAAAASUVORK5CYII=', 'base64') })
      if (url.pathname === '/api/articles/export') {
        assert.deepEqual(request.postDataJSON().articles.map(row => row.id), ['article-a'])
        return route.fulfill({ json: { ok: true, count: 1, downloadUrl: '/api/articles/download?file=test.doc', filePath: 'test.doc' } })
      }
      if (url.pathname === '/api/articles/download') return route.fulfill({ contentType: 'application/msword', body: 'exported' })
      return route.fulfill({ json: { ok: true } })
    })
    await page.goto(vite.resolvedUrls.local[0])
    await page.getByRole('button', { name: '品牌文章系统', exact: true }).click()
    await page.getByRole('button', { name: '成品文章库', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: '文章库加载失败' }).waitFor()
    retryArticleLoad = true
    await page.getByRole('button', { name: '重新加载', exact: true }).click()
    await page.getByRole('status').filter({ hasText: '正在加载文章库' }).waitFor()
    await page.getByText('项目A的文章', { exact: true }).waitFor()
    assert.equal(await page.getByText('其他品牌的文章', { exact: true }).count(), 0)
    await page.getByRole('button', { name: '全文查看', exact: true }).click()
    await page.getByRole('button', { name: '编辑文章', exact: true }).click()
    await page.getByLabel('文章标题', { exact: true }).fill('项目A已修改')
    await page.getByLabel('文章正文', { exact: true }).fill('修改后的正文')
    const imageSelect = page.getByLabel('插入当前品牌图片')
    assert.equal(await imageSelect.locator('option').count(), 2)
    await imageSelect.selectOption(imageUrl)
    await page.getByRole('button', { name: '保存修改', exact: true }).click()
    await page.locator('.article-content-view img').waitFor()
    await page.waitForFunction(() => document.querySelector('.article-content-view img')?.naturalWidth > 0)
    assert.match(stores.a['geo.articleRows'][0].body, /own-a.png/)
    assert.equal(stores.a['geo.articleRows'][0].title, '项目A已修改')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: '下载本文', exact: true }).click()
    assert.equal((await download).suggestedFilename(), 'test.doc')
    await page.getByRole('button', { name: '关闭', exact: true }).click()
    await page.getByRole('button', { name: '企业品牌库', exact: true }).click()
    await page.locator('.project-table .ops-row').filter({ has: page.getByText('品牌一', { exact: true }) }).getByRole('button', { name: '删除', exact: true }).click()
    await page.waitForFunction(() => ![...document.querySelectorAll('.project-table .ops-row strong')].some(node => node.textContent === '品牌一'))
    assert.deepEqual(stores.a['geo.keywordLibraryRows'], [['品牌二', '核心词', 'B']])
    assert.equal(stores.a['geo.taskRows'].length, 1)
    assert.equal(stores.a['geo.articleRows'][0].id, 'other-brand')
    await page.evaluate(() => {
      window.__geoIdentity = { userId: 'user-b', role: 'project_admin', projectId: 'b' }
      window.dispatchEvent(new Event('geo:identity-changed'))
    })
    await page.getByRole('button', { name: '品牌文章系统', exact: true }).click()
    await page.getByRole('button', { name: '成品文章库', exact: true }).click()
    await page.getByText('项目B的文章', { exact: true }).waitFor()
    assert.equal(await page.getByText('项目A已修改', { exact: true }).count(), 0)
    assert.equal(await page.locator('.article-reader-modal').count(), 0)
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
    await vite.close()
  }
})
