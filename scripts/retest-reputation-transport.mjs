import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
const base = 'https://geoskill.7chacha.com'
const out = 'outputs/template-retest-6.2.1'
await fs.mkdir(out, { recursive: true })
const credentials = JSON.parse(await fs.readFile('.tmp/commercial-credentials.json', 'utf8'))
let cookie = ''
async function api(path, body) {
  const r = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: body ? JSON.stringify(body) : undefined })
  if (r.headers.get('set-cookie')) cookie = r.headers.get('set-cookie').split(';')[0]
  const data = await r.json()
  assert.ok(r.ok, data.error)
  return data
}
await api('/api/auth/login', credentials.project)
const project = (await api('/api/state?key=geo.projectRows')).value[0]
const original = JSON.parse(await fs.readFile('outputs/template-retest-6.2.0/job.json', 'utf8')).articles[3]
let job = (await api('/api/jobs/start', { project, count: 1, taskName: '口碑稿接口格式复测-6.2.1', packet: { coreKeyword: original.keyword }, plans: [{ articleType: '口碑核查', writingSceneMode: '按实际场景写', editorialBrief: original.editorialBrief }] })).job
console.log(job.id)
while (['queued', 'running'].includes(job.status)) {
  await new Promise(r => setTimeout(r, 10000))
  job = (await api('/api/jobs/status?id=' + job.id)).job
  await fs.writeFile(out + '/job.json', JSON.stringify(job, null, 2))
}
assert.equal(job.failed, 0)
assert.equal(job.articles[0].production.version, '6.2.1')
console.log(JSON.stringify({ status: job.status, words: job.articles[0].words, title: job.articles[0].title }))
