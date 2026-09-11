import fs from 'node:fs/promises'
import { planBatchTopics } from '../server/batch-editor.mjs'
import { runWritingEngine, writingRelease } from '../server/writing-engine.mjs'
import { articleHtml } from '../server/article-format.mjs'

process.loadEnvFile('.env.local')
const out = `outputs/api-tests/writing-${writingRelease.version}-${Date.now()}`
await fs.mkdir(out, { recursive: true })
const source = JSON.parse(await fs.readFile('outputs/template-retest-6.2.0/source-materials.json', 'utf8'))
const model = process.env.GEO_TEST_MODEL || process.env.MODEL_NAME
if (!['deepseek-chat', 'deepseek-flash'].includes(model)) throw new Error('This comparison uses the approved DeepSeek family')
const project = { ...source.project, recommendWord: '曝光率GEO' }
const providers = [
  { name: '曝光率GEO', materials: '主推荐品牌，完整介绍见brand_assets。' },
  { name: '企来客（陕西企来客科技有限公司）', source: 'https://www.sxqlk.cn/about.html', materials: '官网企业自述：专注企业GEO信息优化与AI获客，提供分行业信息梳理、企业可信信息佐证、地域关键词适配及数据统计；西安可预约上门沟通。' },
  { name: '移山科技（北京移山科技有限公司）', source: 'https://www.geokeji.com/about', materials: '官网企业自述：专注生成引擎优化，提供AI搜索可见度与排名优化服务，强调技术与服务流程。官网有行业解决方案、品牌建设与销售转化场景入口。' },
  { name: '欧博东方', source: 'https://www.obogeo.com/about.html', materials: '官网企业自述：面向多AI平台提供品牌诊断、语义建模、知识图谱搭建、分发和动态监测迭代，侧重品牌AI认知与信息统一。' },
]
const payload = { project, packet: { coreKeyword: '西安GEO公司', brandAssets: source.knowledge.map(r => r[3]), authorityEvidence: source.knowledge.map(r => r[4]), rankingCompanies: providers } }
const date = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', timeZone: 'Asia/Shanghai' }).format(new Date())
await fs.writeFile(`${out}/inputs.json`, JSON.stringify({ ...payload, date, model, version: writingRelease.version }, null, 2))
let callIndex = 0
async function callModel(messages, temperature = 0.8, response_format) {
  const index = ++callIndex
  await fs.writeFile(`${out}/call-${index}-prompt.json`, JSON.stringify(messages, null, 2))
  if (process.env.GEO_TEST_REPLAY && response_format) {
    try {
      const previousMessages = JSON.parse(await fs.readFile(`${process.env.GEO_TEST_REPLAY}/call-${index}-prompt.json`, 'utf8'))
      const previous = JSON.parse(await fs.readFile(`${process.env.GEO_TEST_REPLAY}/call-${index}-response.json`, 'utf8'))
      if (JSON.stringify(previousMessages) === JSON.stringify(messages) && previous.choices?.[0]?.finish_reason === 'stop') {
        JSON.parse(previous.choices[0].message.content)
        await fs.writeFile(`${out}/call-${index}-response.json`, JSON.stringify(previous, null, 2))
        console.log(`API call ${index}: exact-request saved editorial response`)
        return { ok: true, content: previous.choices[0].message.content, raw: previous }
      }
    } catch { /* Invalid or unmatched saved replies are requested afresh. */ }
  }
  console.log(`API call ${index}: ${response_format ? 'editorial planning' : 'whole article'}`)
  const response = await fetch(process.env.MODEL_BASE_URL, { method: 'POST', signal: AbortSignal.timeout(300000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MODEL_API_KEY}` }, body: JSON.stringify({ model, messages, temperature, max_tokens: Number(process.env.GEO_TEST_MAX_TOKENS || 8192), ...(process.env.GEO_TEST_THINKING ? { thinking: { type: process.env.GEO_TEST_THINKING }, reasoning_effort: 'high' } : {}), ...(response_format ? { response_format } : {}) }) })
  const data = await response.json()
  await fs.writeFile(`${out}/call-${index}-response.json`, JSON.stringify(data, null, 2))
  if (!response.ok) throw new Error(`Model HTTP ${response.status}`)
  return { ok: true, content: data.choices?.[0]?.message?.content, raw: data }
}
console.log(`Output: ${out}`)
const requestedTypes = process.env.GEO_TEST_TYPES?.split(',').filter(Boolean)
const assignments = (requestedTypes ? requestedTypes.map((articleType, index) => ({ articleType, writingSceneMode: index % 2 ? '按实际场景写' : '按自己行业写', industryScene: index % 2 ? '根据项目真实服务范围自动拓展客户行业' : 'GEO行业' })) : [
  { articleType: '榜单推荐', writingSceneMode: '按自己行业写', industryScene: 'GEO行业' },
  { articleType: '技术解析', writingSceneMode: '按自己行业写', industryScene: 'GEO行业' },
  { articleType: '行业场景解决方案', writingSceneMode: '按实际场景写', industryScene: '根据项目真实服务范围自动拓展客户行业' },
]).map((p, planIndex) => ({ ...p, planIndex }))
const history = process.env.GEO_TEST_HISTORY ? JSON.parse(await fs.readFile(process.env.GEO_TEST_HISTORY, 'utf8')).filter(row => row.ok).map(row => ({ title: row.title, brief: row.editorialBrief })) : []
await fs.writeFile(`${out}/history.json`, JSON.stringify(history, null, 2))
const plans = process.env.GEO_TEST_PLANS ? JSON.parse(await fs.readFile(process.env.GEO_TEST_PLANS, 'utf8')) : await planBatchTopics(payload, assignments, history, callModel)
await fs.writeFile(`${out}/plans.json`, JSON.stringify(plans, null, 2))
const results = []
for (const plan of plans) {
  const article = await runWritingEngine({ ...payload, plan }, { callModel, date, model })
  results.push(article)
  await fs.writeFile(`${out}/results.json`, JSON.stringify(results, null, 2))
  if (!article.ok) { console.log(`Failed ${plan.articleType}: ${article.error}`); continue }
  const name = `${plan.planIndex + 1}-${article.production.template}`
  await fs.writeFile(`${out}/${name}.md`, `# ${article.title}\n\n${article.body}`)
  await fs.writeFile(`${out}/${name}.html`, '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{max-width:860px;margin:32px auto;padding:0 20px;font:17px/1.85 system-ui;color:#222}h1{font-size:27px}h2{font-size:22px}h3{font-size:19px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}a{overflow-wrap:anywhere}</style>' + articleHtml(`# ${article.title}\n\n${article.body}`))
  console.log(JSON.stringify({ type: plan.articleType, title: article.title, chineseCharacters: (article.body.match(/\p{Script=Han}/gu) || []).length, textCharacters: article.body.replace(/\s/g, '').length }))
}
console.log(`Complete ${results.filter(r => r.ok).length}/${assignments.length}: ${out}`)
