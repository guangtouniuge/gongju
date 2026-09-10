import test from 'node:test'
import assert from 'node:assert/strict'
import { planBatchTopics, topicHistory } from './batch-editor.mjs'
import { buildIsolatedEditor } from './skill-editor.mjs'

test('batch plans preserve templates and modes, carry history, and reach the writing prompt', async () => {
  const plans = Array.from({ length: 10 }, (_, i) => ({ articleType: '榜单推荐', planIndex: i, writingSceneMode: '按自己行业写' }))
  let calls = 0
  const model = async messages => {
    const input = JSON.parse(messages[1].content.split('项目资料：\n')[1])
    assert.equal(input.previousTopics[0].title, '历史文章')
    assert.equal(input.plannedTopics.length, calls++ ? 8 : 0)
    assert.ok(input.assignments.every(a => a.mode === '按自己行业写'))
    return { ok: true, content: JSON.stringify({ briefs: input.assignments.map(a => ({ id: a.id, centralQuestion: `问题${a.id}`, readerSituation: `处境${a.id}` })) }) }
  }
  const output = await planBatchTopics({ project: { name: '测试项目' } }, plans, [{ title: '历史文章' }], model)
  assert.equal(calls, 2)
  assert.equal(new Set(output.map(p => p.question)).size, 10)
  assert.ok(output.every(p => p.articleType === '榜单推荐'))
  const editor = buildIsolatedEditor({ plan: output[2] }, '2026年9月')
  assert.ok(editor.messages[1].content.includes('问题2'))
  assert.equal(editor.template.id, 'A')
})

test('history belongs to the selected project only', () => {
  assert.deepEqual(topicHistory([{ project: 'a', title: 'a' }, { project: 'b', title: 'b' }], { name: 'a' }).map(x => x.title), ['a'])
})

test('incomplete API planning response is an interface error, not silently generic plans', async () => {
  await assert.rejects(planBatchTopics({}, [{ articleType: '榜单推荐' }], [], async () => ({ ok: true, content: '{"briefs":[]}' })), /数量/)
})
