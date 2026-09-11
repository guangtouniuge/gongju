import fs from 'node:fs/promises'
import { articleHtml } from '../server/article-format.mjs'
import { templateNames } from '../server/skill-editor.mjs'

const base = 'https://geoskill.7chacha.com'
const credentials = JSON.parse(await fs.readFile('.tmp/commercial-credentials.json', 'utf8'))
if (credentials.projectId !== 'exposure-main') throw new Error('Unexpected project')
const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials.project) })
if (!login.ok) throw new Error(`Login HTTP ${login.status}`)
const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
async function api(path, body) {
  const response = await fetch(`${base}${path}`, { method: body ? 'POST' : 'GET', headers: { cookie, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const result = await response.json()
  if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`)
  return result
}
const out = `outputs/api-tests/website-${Date.now()}`
await fs.mkdir(out, { recursive: true })
const keys = ['geo.projectRows', 'geo.rankingCandidateRows', 'geo.keywordRows']
const before = {}
for (const key of keys) before[key] = (await api(`/api/state?key=${key}`)).value
await fs.writeFile(`${out}/state-before.json`, JSON.stringify(before, null, 2))
const project = before['geo.projectRows'].find(row => row.name === '曝光率GEO')
if (!project || project.projectId !== 'exposure-main') throw new Error('Unexpected brand')
if (process.env.GEO_SYNC_CONFIRMED_PROVIDERS === '1') {
  const tested = JSON.parse(await fs.readFile(process.env.GEO_TESTED_INPUT, 'utf8'))
  const date = new Date().toISOString().slice(0, 10)
  const peers = tested.packet.rankingCompanies.slice(1)
  if (peers.length !== 3 || !peers.some(peer => peer.name.includes('企来客'))) throw new Error('Unexpected confirmed provider list')
  const rows = before['geo.rankingCandidateRows'].filter(row => row[0] !== project.name)
  rows.push(...peers.map(peer => [project.name, peer.name, `${peer.materials} 来源：${peer.source}`, '', '', '', '否', date]))
  await api('/api/state', { key: 'geo.rankingCandidateRows', value: rows })
  Object.assign(project, { brand: '西安曝光率网络科技有限公司', recommendWord: '曝光率GEO' })
  await api('/api/state', { key: 'geo.projectRows', value: before['geo.projectRows'] })
}
const cores = before['geo.keywordRows'].filter(row => row[0] === project.name).map(row => row[1])
const core = cores.find(value => value === '西安GEO公司') || cores[0] || project.coreKeyword
if (!core) throw new Error('No stored core keyword')
const types = (process.env.GEO_LIVE_TYPES || '榜单推荐,深度测评,口碑核查,服务商对比,资质实力解析').split(',')
const sceneOffset = Number(process.env.GEO_SCENE_OFFSET || 0)
if (![0, 1].includes(sceneOffset)) throw new Error('Scene offset must be 0 or 1')
const fixedMode = process.env.GEO_LIVE_SCENE_MODE
if (fixedMode && !['按自己行业写', '按实际场景写'].includes(fixedMode)) throw new Error('Unknown scene mode')
let plans = types.map((articleType, planIndex) => {
  const writingSceneMode = fixedMode || ((planIndex + sceneOffset) % 2 ? '按实际场景写' : '按自己行业写')
  return { articleType, planIndex, writingSceneMode, industryScene: writingSceneMode === '按实际场景写' ? '根据项目真实服务范围自动拓展客户行业' : project.industry }
})
if (process.env.GEO_REPLAY_ARTICLE_FILE) {
  if (process.env.GEO_SYNC_CONFIRMED_PROVIDERS === '1') throw new Error('Replay must not change provider data')
  const articles = JSON.parse(await fs.readFile(process.env.GEO_REPLAY_ARTICLE_FILE, 'utf8'))
  const index = Number(process.env.GEO_REPLAY_ARTICLE_INDEX || 0)
  const article = Number.isInteger(index) && index >= 0 ? articles[index] : undefined
  if (!article?.editorialBrief || article.projectId !== project.projectId || article.keyword !== core || !fixedMode) throw new Error('Replay needs a matching project, keyword, stored brief and explicit scene mode')
  const templateIndex = 'ABCDEFGHIJKL'.indexOf(article.production?.template)
  if (templateIndex < 0) throw new Error('Unknown replay template')
  plans = [{ articleType: templateNames[templateIndex], planIndex: 0, writingSceneMode: fixedMode,
    industryScene: article.editorialBrief.customerIndustry || project.industry,
    editorialBrief: article.editorialBrief, question: article.editorialBrief.businessProblem, angle: article.editorialBrief.readerSituation }]
  await fs.writeFile(`${out}/replay-baseline.json`, JSON.stringify({ source: process.env.GEO_REPLAY_ARTICLE_FILE, index, articleId: article.id, title: article.title, production: article.production, plan: plans[0] }, null, 2))
  if (process.env.GEO_REBUILD_REPLAY_BRIEF === '1') {
    delete plans[0].editorialBrief
    plans[0].lockTopic = true
  }
}
const taskName = `榜单生产验收 ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}`
const start = process.env.GEO_EXISTING_JOB ? { job: { id: process.env.GEO_EXISTING_JOB } } : await api('/api/jobs/start', { project, packet: { coreKeyword: core }, plans, taskName, count: plans.length })
await fs.writeFile(`${out}/job-start.json`, JSON.stringify(start, null, 2))
console.log(`Website job ${start.job.id}: ${out}`)
let last = -1
for (;;) {
  const { job } = await api(`/api/jobs/status?id=${encodeURIComponent(start.job.id)}`)
  await fs.writeFile(`${out}/job.json`, JSON.stringify(job, null, 2))
  if (job.completed !== last) { console.log(`${job.completed}/${job.total}: ${job.status}`); last = job.completed }
  if (['done', 'failed'].includes(job.status)) {
    const results = job.articles.map(article => ({ ...article, ok: article.status === '已生成' }))
    await fs.writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
    for (const [index, article] of results.entries()) {
      const name = `${index + 1}-${article.production?.template || 'unknown'}`
      const markdown = `# ${article.title}\n\n${article.body}`
      await fs.writeFile(`${out}/${name}.md`, markdown)
      await fs.writeFile(`${out}/${name}.html`, '<!doctype html><meta charset="utf-8"><style>body{max-width:850px;margin:32px auto;font:17px/1.9 system-ui}img{max-width:100%}td,th{border:1px solid #ddd;padding:8px}table{border-collapse:collapse}</style>' + articleHtml(markdown))
    }
    const complete = results.filter(article => article.ok)
    if (complete.length) {
      const exported = await api('/api/articles/export', { articles: complete.map(article => ({ id: article.id })), format: 'doc', filePrefix: taskName })
      const download = await fetch(`${base}${exported.downloadUrl}`, { headers: { cookie } })
      if (!download.ok) throw new Error(`Download HTTP ${download.status}`)
      const content = Buffer.from(await download.arrayBuffer())
      await fs.writeFile(`${out}/articles.doc`, content)
      const text = content.toString('utf8')
      if (complete.some(article => !text.includes(article.title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')))) throw new Error('Downloaded document is missing an article title')
      await fs.writeFile(`${out}/download-check.json`, JSON.stringify({ count: exported.count, bytes: content.length, allTitlesPresent: true }, null, 2))
    }
    console.log(JSON.stringify({ status: job.status, completed: job.completed, failed: job.failed, versions: results.map(article => article.production?.version), titles: results.map(article => article.title) }))
    if (job.status !== 'done' || job.failed) process.exitCode = 1
    break
  }
  await new Promise(resolve => setTimeout(resolve, 5000))
}
