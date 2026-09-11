import fs from 'node:fs/promises'
import { planBatchTopics, topicHistory } from '../server/batch-editor.mjs'
import { templateNames } from '../server/skill-editor.mjs'
import { runWritingEngine } from '../server/writing-engine.mjs'
import { articleHtml } from '../server/article-format.mjs'
process.loadEnvFile('.env.local')
const out = process.env.GEO_TEST_OUTPUT || 'outputs/api-tests/batch-topics-20260911'
await fs.mkdir(out, { recursive: true })
const state = async key => (await (await fetch(`https://geoskill.7chacha.com/api/state?key=${key}`)).json()).value || []
const projects = await state('geo.projectRows')
const project = projects.find(p => p.name === '曝光率GEO')
if (!project) throw new Error('Project missing')
const knowledge = (await state('geo.knowledgeContentRows')).filter(r => r[0] === project.name)
const rows = await state('geo.articleRows')
const candidates = (await state('geo.rankingCandidateRows')).filter(r => r[0] === project.name)
const payload = { project, packet: { coreKeyword: project.coreKeyword || '西安GEO公司', writingSceneMode: '按自己行业写', brandAssets: knowledge.map(r => r[3]), authorityEvidence: knowledge.map(r => r[4]), rankingCompanies: [{ name: project.brand }, ...candidates.map(r => ({ name: r[1], materials: r.slice(2) }))] } }
const call = async (messages, temperature = 0.8, response_format = { type: 'json_object' }) => {
  const response = await fetch(process.env.MODEL_BASE_URL || process.env.QWEN_BASE_URL, { method: 'POST', signal: AbortSignal.timeout(240000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MODEL_API_KEY || process.env.QWEN_API_KEY}` }, body: JSON.stringify({ model: process.env.MODEL_NAME || process.env.QWEN_MODEL, messages, temperature, max_tokens: 8192, response_format }) })
  const data = await response.json()
  if (!response.ok) throw new Error(`API status ${response.status}`)
  return { ok: true, content: data.choices[0].message.content, raw: data }
}
const types = process.env.GEO_TEST_ALL_TYPES ? templateNames : ['榜单推荐', '榜单推荐', '榜单推荐']
console.log(`Planning ${types.length} articles with project materials`)
const plans = await planBatchTopics(payload, types.map((articleType, planIndex) => ({ planIndex, articleType, writingSceneMode: planIndex % 2 ? '按实际场景写' : '按自己行业写', industryScene: planIndex % 2 ? '自动拓展' : 'GEO行业' })), topicHistory(rows, project), call)
await fs.writeFile(`${out}/plans.json`, JSON.stringify(plans, null, 2))
const articles = []
for (const plan of plans) {
  console.log(`Writing ${plan.planIndex + 1}: ${plan.question}`)
  const date = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', timeZone: 'Asia/Shanghai' }).format(new Date())
  const article = await runWritingEngine({ ...payload, plan, previousArticles: articles }, { date, model: process.env.MODEL_NAME || process.env.QWEN_MODEL, callModel: call })
  if (!article.ok) throw new Error(article.error)
  articles.push(article)
  await fs.writeFile(`${out}/article-${plan.planIndex + 1}.json`, JSON.stringify(article, null, 2))
  await fs.writeFile(`${out}/article-${plan.planIndex + 1}.html`, '<meta charset="utf-8"><style>body{max-width:850px;margin:40px auto;font:18px/1.8 sans-serif}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px}</style>' + articleHtml(`# ${article.title}\n\n${article.body}`))
  console.log(`Completed ${plan.planIndex + 1}: ${article.title} (${article.body.length} characters)`)
}
await fs.writeFile(`${out}/articles.json`, JSON.stringify(articles, null, 2))
console.log('Completed; original API output preserved, no rewrite.')
