import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
const out = 'outputs/all-template-acceptance-20260911'
const job = JSON.parse(await fs.readFile(out + '/job.json', 'utf8'))
const credentials = JSON.parse(await fs.readFile('.tmp/commercial-credentials.json', 'utf8'))
const base = 'https://geoskill.7chacha.com'
const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials.project) })
assert.ok(login.ok)
const cookie = login.headers.get('set-cookie').split(';')[0]
const response = await fetch(base + '/api/articles/export', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ brand: job.articles[0].project, filePrefix: '12类型API测试原稿', format: 'doc', articles: job.articles }) })
const result = await response.json()
assert.ok(response.ok, result.error)
assert.equal(result.count, 12)
const download = await fetch(base + result.downloadUrl, { headers: { Cookie: cookie } })
assert.ok(download.ok)
const bytes = Buffer.from(await download.arrayBuffer())
assert.ok(bytes.length > 10000)
await fs.writeFile(out + '/12类型API测试原稿.doc', bytes)
const candidates = await fetch(base + '/api/state?key=geo.rankingCandidateRows', { headers: { Cookie: cookie } })
await fs.writeFile(out + '/provider-materials.json', JSON.stringify(await candidates.json(), null, 2))
console.log(JSON.stringify({ count: result.count, bytes: bytes.length, downloadStatus: download.status, embeddedImages: (bytes.toString().match(/<img\b/g) || []).length }))
