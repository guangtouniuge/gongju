import fs from 'node:fs/promises'
const base = 'https://geoskill.7chacha.com'
const out = process.env.GEO_TEST_OUTPUT || 'outputs/api-tests/batch-topics-online'
const api = async (path, body) => {
  const response = await fetch(base + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
  const value = await response.json()
  if (!response.ok || value.ok === false) throw new Error(value.error || `HTTP ${response.status}`)
  return value
}
const state = async key => (await api('/api/state?key=' + key)).value || []
const project = (await state('geo.projectRows')).find(p => p.name === '曝光率GEO')
const rows = (await state('geo.knowledgeContentRows')).filter(r => r[0] === project.name)
const candidates = (await state('geo.rankingCandidateRows')).filter(r => r[0] === project.name)
let job = (await api('/api/jobs/start', {
  project, count: 2, taskName: process.env.GEO_TEST_TASK_NAME || '批量选题与排版验收-20260911',
  task: { articleType: '榜单推荐', writingSceneMode: '按自己行业写' },
  packet: { coreKeyword: '西安GEO公司', writingSceneMode: '按自己行业写', brandAssets: rows.map(r => r[3]), authorityEvidence: rows.map(r => r[4]), rankingCompanies: [{ name: project.brand }, ...candidates.map(r => ({ name: r[1], materials: r.slice(2) }))] },
})).job
console.log(`Started ${job.id}`)
let n = 0
while (['running', 'queued'].includes(job.status)) {
  await new Promise(resolve => setTimeout(resolve, 5000))
  job = (await api('/api/jobs/status?id=' + job.id)).job
  if (job.articles.length !== n) {
    n = job.articles.length
    console.log(`Completed ${n}/2`)
  }
}
await fs.mkdir(out, { recursive: true })
await fs.writeFile(`${out}/job.json`, JSON.stringify(job, null, 2))
if (job.status !== 'done' || job.articles.length !== 2 || job.failed) throw new Error(job.error || 'Incomplete online batch')
if (job.articles.some(a => !a.editorialBrief)) throw new Error('Missing saved brief')
console.log(job.articles.map(a => ({ title: a.title, question: a.editorialBrief.centralQuestion, words: a.words })))
