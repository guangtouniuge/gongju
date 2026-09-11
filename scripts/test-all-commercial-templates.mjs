import fs from 'node:fs/promises'
import { templateNames } from '../server/skill-editor.mjs'
const base = 'https://geoskill.7chacha.com'
const out = 'outputs/all-template-acceptance-20260911'
await fs.mkdir(out, { recursive: true })
const credentials = JSON.parse(await fs.readFile('.tmp/commercial-credentials.json', 'utf8'))
let cookie = ''
async function api(route, body) {
  const response = await fetch(base + route, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || String(response.status))
  if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0]
  return result
}
await api('/api/auth/login', credentials.project)
let job
try {
  const saved = JSON.parse(await fs.readFile(out + '/job.json', 'utf8'))
  job = (await api('/api/jobs/status?id=' + saved.id)).job
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  const project = (await api('/api/state?key=geo.projectRows')).value[0]
  const keywords = (await api('/api/state?key=geo.keywordRows')).value
  const coreKeyword = keywords.find(row => row[0] === project.name)?.[1] || project.coreKeyword
  const knowledge = (await api('/api/state?key=geo.knowledgeContentRows')).value
  await fs.writeFile(out + '/source-materials.json', JSON.stringify({ project, knowledge }, null, 2))
  const plans = templateNames.map((articleType, i) => ({ articleType, planIndex: i, writingSceneMode: i % 2 ? '按实际场景写' : '按自己行业写', industryScene: i % 2 ? '根据项目真实服务范围自动拓展客户行业' : '', title: '', angle: '', lockTitle: false }))
  job = (await api('/api/jobs/start', { project, packet: { coreKeyword }, plans, count: 12, taskName: '12类型全链路验收-20260911', task: { articleType: templateNames.join('、') } })).job
  await fs.writeFile(out + '/job.json', JSON.stringify(job, null, 2))
}
console.log('Batch: ' + job.id)
let last = ''
while (['queued', 'running'].includes(job.status)) {
  await new Promise(resolve => setTimeout(resolve, 10000))
  job = (await api('/api/jobs/status?id=' + job.id)).job
  await fs.writeFile(out + '/job.json', JSON.stringify(job, null, 2))
  const state = JSON.stringify({ status: job.status, articles: job.articles?.length, failed: job.failed })
  if (state !== last) { console.log(state); last = state }
}
const summary = []
for (const [index, article] of (job.articles || []).entries()) {
  await fs.writeFile(`${out}/${String(index + 1).padStart(2, '0')}-${article.production?.template || 'unknown'}.md`, `# ${article.title}\n\n${article.body}`)
  const images = []
  for (const src of article.imagePaths || []) {
    const response = await fetch(base + src, { headers: { Cookie: cookie } })
    images.push(response.status)
  }
  summary.push({ id: article.id, template: article.production?.template, title: article.title, words: article.words, images, brief: article.editorialBrief, headings: [...article.body.matchAll(/^#{1,6} .+$/gm)].map(m => m[0]) })
}
await fs.writeFile(out + '/summary.json', JSON.stringify({ jobId: job.id, status: job.status, failed: job.failed, articles: summary }, null, 2))
console.log(JSON.stringify({ status: job.status, completed: summary.length, failed: job.failed, output: out }))
