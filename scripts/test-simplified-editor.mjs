import fs from 'node:fs/promises'
import { runInProjectScope, validateGenerationScope } from '../server/project-scope.mjs'
import { runWritingEngine, writingRelease } from '../server/writing-engine.mjs'
import { templateNames, buildIsolatedEditor } from '../server/skill-editor.mjs'
import { modelRequestOptions } from '../server/model-request.mjs'

process.loadEnvFile('.env.local')
const credentials = JSON.parse(await fs.readFile('.tmp/commercial-credentials.json', 'utf8'))
const base = 'https://geoskill.7chacha.com'
const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials.project) })
if (!login.ok) throw new Error('Login failed')
const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
const state = {}
for (const key of ['projectRows', 'knowledgeContentRows', 'rankingCandidateRows', 'keywordRows', 'keywordLibraryRows', 'questionRows']) {
  const response = await fetch(`${base}/api/state?key=geo.${key}`, { headers: { cookie } })
  if (!response.ok) throw new Error(`State read failed: ${key}`)
  state[`geo.${key}`] = (await response.json()).value
}
const project = state['geo.projectRows'].find(row => row.name === '曝光率GEO')
if (project?.projectId !== 'exposure-main') throw new Error('Unexpected project')
const source = process.env.GEO_COMPARISON_SOURCE || 'outputs/api-tests/website-1789144820582/results.json'
const index = Number(process.env.GEO_COMPARISON_INDEX || 0)
const baseline = JSON.parse(await fs.readFile(source, 'utf8'))[index]
if (!baseline?.editorialBrief) throw new Error('Baseline has no brief')
if (baseline.projectId !== project.projectId) throw new Error('Baseline belongs to a different project')
const articleType = templateNames['ABCDEFGHIJKL'.indexOf(baseline.production.template)]
const payload = runInProjectScope({ projectId: project.projectId }, () => validateGenerationScope({ project, packet: { coreKeyword: baseline.keyword }, plan: {
  articleType, writingSceneMode: '按自己行业写', editorialBrief: baseline.editorialBrief, planIndex: 0,
} }, key => state[key]))
const date = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', timeZone: 'Asia/Shanghai' }).format(new Date())
const out = `outputs/api-tests/simplified-${writingRelease.version}-${Date.now()}`
await fs.mkdir(out, { recursive: true })
await fs.writeFile(`${out}/inputs.json`, JSON.stringify({ payload, date, source, index }, null, 2))
await fs.writeFile(`${out}/baseline.json`, JSON.stringify(baseline, null, 2))
const messages = buildIsolatedEditor(payload, date).messages
await fs.writeFile(`${out}/prompt.json`, JSON.stringify(messages, null, 2))
console.log(`Output: ${out}`)
const model = process.env.GEO_TEST_MODEL || 'deepseek-flash'
let calls = 0
const result = await runWritingEngine(payload, { date, model, callModel: async (messages, temperature, response_format) => {
  calls++
  const options = modelRequestOptions({ MODEL_NAME: model, MODEL_MAX_TOKENS: '24576', MODEL_THINKING: 'enabled', MODEL_REASONING_EFFORT: 'high' }, temperature, response_format)
  const response = await fetch(process.env.MODEL_BASE_URL, { method: 'POST', signal: AbortSignal.timeout(300000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MODEL_API_KEY}` }, body: JSON.stringify({ ...options, messages }) })
  const raw = await response.json()
  await fs.writeFile(`${out}/response.json`, JSON.stringify(raw, null, 2))
  return { ok: response.ok, content: raw.choices?.[0]?.message?.content, raw }
} })
await fs.writeFile(`${out}/result.json`, JSON.stringify(result, null, 2))
if (!result.ok) throw new Error(result.error)
await fs.writeFile(`${out}/article.md`, `# ${result.title}\n\n${result.body}`)
console.log(JSON.stringify({ calls, title: result.title, model: result.production?.resolvedModel, chars: (result.body.match(/\p{Script=Han}/gu) || []).length }))
