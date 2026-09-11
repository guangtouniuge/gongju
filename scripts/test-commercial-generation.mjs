import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
const base = 'https://geoskill.7chacha.com'
const credentials = JSON.parse(await fs.readFile('.tmp/commercial-credentials.json', 'utf8'))
let cookie = ''
async function api(route, body) {
  const response = await fetch(base + route, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: body ? JSON.stringify(body) : undefined })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || String(response.status))
  if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0]
  return result
}
await api('/api/auth/login', credentials.project)
const project = (await api('/api/state?key=geo.projectRows')).value[0]
const keywords = (await api('/api/state?key=geo.keywordRows')).value
const coreKeyword = keywords.find(row => row[0] === project.name)?.[1] || project.coreKeyword
assert.ok(coreKeyword, 'Stored brand must have a core keyword')
let job = (await api('/api/jobs/start', { project, count: 1, taskName: '登录隔离后生产验收-20260911', task: { articleType: '技术解析', writingSceneMode: '按自己行业写' }, packet: { coreKeyword } })).job
console.log('Started authenticated generation ' + job.id)
for (let i = 0; i < 180 && ['queued', 'running'].includes(job.status); i++) {
  await new Promise(resolve => setTimeout(resolve, 5000))
  job = (await api('/api/jobs/status?id=' + job.id)).job
}
await fs.mkdir('outputs/commercial-acceptance', { recursive: true })
await fs.writeFile('outputs/commercial-acceptance/generation.json', JSON.stringify(job, null, 2))
assert.equal(job.status, 'done')
assert.equal(job.failed, 0)
assert.equal(job.articles.length, 1)
assert.equal(job.articles[0].projectId, credentials.projectId)
assert.equal(job.articles[0].production.template, 'G')
for (const src of job.articles[0].imagePaths || []) {
  const response = await fetch(base + src, { headers: { Cookie: cookie } })
  assert.equal(response.status, 200)
}
console.log(JSON.stringify({ title: job.articles[0].title, words: job.articles[0].words, images: job.articles[0].imagePaths?.length, isolatedProject: job.articles[0].projectId }))
