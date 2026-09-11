import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import assert from 'node:assert/strict'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'geo-recovery-'))
const serverFile = path.resolve('.tmp/live-skill-release/server/geo-api-server.mjs')
let writes = 0
const plannerHistories = []
const upstream = http.createServer(async (req, res) => {
  let raw = ''
  for await (const chunk of req) raw += chunk
  const request = JSON.parse(raw)
  let content
  if (request.messages[0].content.includes('批量文章的选题编辑')) {
    const input = JSON.parse(request.messages[1].content.split('项目资料：\n')[1])
    plannerHistories.push(input.previousTopics)
    content = { briefs: input.assignments.map(item => ({ id: item.id, readerSituation: '测试处境', centralQuestion: `问题${item.id}`, argumentSpine: '问题到依据到推荐', decisionLinks: [] })) }
  } else {
    writes++
    const n = writes
    if (n === 2) await new Promise(r => setTimeout(r, 2500))
    content = { title: `恢复测试文章${n}`, body: `## 选择依据\n\n这是第${n}次接口返回的测试正文。` }
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }] }))
})
upstream.listen(0, '127.0.0.1')
await once(upstream, 'listening')
const portProbe = http.createServer().listen(0, '127.0.0.1')
await once(portProbe, 'listening')
const port = portProbe.address().port
await new Promise(r => portProbe.close(r))
let child
const api = async (route, body) => {
  const response = await fetch(`http://127.0.0.1:${port}${route}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
  const result = await response.json()
  if (!response.ok) throw new Error(JSON.stringify(result))
  return result
}
const until = async fn => {
  for (let n = 0; n < 150; n++) { try { const value = await fn(); if (value) return value } catch {} ; await new Promise(r => setTimeout(r, 100)) }
  throw new Error('Timed out')
}
const start = async () => {
  child = spawn(process.execPath, [serverFile], { cwd: root, env: { ...process.env, GEO_API_PORT: String(port), GEO_JOB_DIR: path.join(root, 'jobs'), MODEL_BASE_URL: `http://127.0.0.1:${upstream.address().port}`, MODEL_API_KEY: 'fake-test-key', MODEL_NAME: 'fake-model' }, stdio: 'pipe' })
  child.stdout.resume(); child.stderr.resume()
  await until(() => api('/api/config/status'))
}
const stop = async () => { if (child && child.exitCode === null) { child.kill('SIGKILL'); await once(child, 'exit') } }
try {
  await start()
  const body = { project: { name: '恢复测试', brand: '测试品牌' }, taskName: '恢复A', count: 2, packet: { coreKeyword: '咨询公司' }, task: { articleType: '榜单推荐' } }
  const a = (await api('/api/jobs/start', body)).job.id
  const b = (await api('/api/jobs/start', { ...body, taskName: '恢复B', count: 1 })).job.id
  await until(async () => (await api('/api/jobs/status?id=' + a)).job.completed === 1 && writes >= 2)
  assert.equal(plannerHistories.length, 1, 'same-project planner must wait')
  const savedId = (await api('/api/jobs/status?id=' + a)).job.articles[0].id
  await stop()
  await start()
  const doneA = await until(async () => { const j = (await api('/api/jobs/status?id=' + a)).job; return j.status === 'done' && j })
  const doneB = await until(async () => { const j = (await api('/api/jobs/status?id=' + b)).job; return j.status === 'done' && j })
  assert.equal(doneA.articles.length, 2)
  assert.equal(doneA.articles[0].id, savedId)
  assert.equal(doneB.articles.length, 1)
  assert.equal(plannerHistories.length, 2, 'original brief must survive restart')
  assert.equal(plannerHistories[1].length, 2, 'queued batch sees preceding completed articles')
  await stop(); await start()
  assert.equal((await api('/api/jobs/status?id=' + a)).job.articles[0].id, savedId)
  console.log('PASS: kill mid-article, restart, retain saved article and original brief; same-project queue sees completed history; finished job survives restart.')
} finally {
  await stop()
  await new Promise(r => upstream.close(r))
  const resolved = path.resolve(root)
  if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unsafe test cleanup path')
  fs.rmSync(resolved, { recursive: true, force: true })
}
