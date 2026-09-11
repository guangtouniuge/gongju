import test from 'node:test'
import assert from 'node:assert/strict'
import { planBatchTopics, topicHistory } from './batch-editor.mjs'
import { buildIsolatedEditor, selectTemplate, templateNames } from './skill-editor.mjs'

test('one batch topic call preserves ten isolated writing templates and history', async () => {
  const assignments = Array.from({ length: 10 }, (_, planIndex) => ({ articleType: templateNames[planIndex], planIndex, writingSceneMode: planIndex % 2 ? '按实际场景写' : '按自己行业写', industryScene: 'GEO行业' }))
  let calls = 0
  const progress = []
  const plans = await planBatchTopics({ packet: { coreKeyword: '西安GEO公司' } }, assignments, [{ title: '历史文章', brief: { centralQuestion: '旧问题', readerSituation: 'DO_NOT_COPY_OLD_STORY' } }], async messages => {
    calls++
    const input = JSON.parse(messages[1].content.split('项目资料：\n')[1])
    assert.equal(input.previousTopics[0].title, '历史文章')
    assert.equal(input.previousTopics[0].question, undefined)
    assert.ok(!JSON.stringify(messages).includes('DO_NOT_COPY_OLD_STORY'))
    assert.equal(input.assignments.length, 10)
    assert.ok(input.assignments.every(a => a.articleType && a.originalTemplate === selectTemplate(a.articleType).text))
    assert.equal(input.assignments[0].scene, undefined)
    assert.equal(input.assignments[1].scene, 'GEO行业')
    return { ok: true, content: JSON.stringify({ briefs: input.assignments.map(a => ({ id: a.id, businessProblem: `问题${a.id}`, customerQuestion: `终端问法${a.id}`, readerSituation: `处境${a.id}`, sectionTasks: ['UNWANTED_REPLACEMENT_OUTLINE'] })) }) }
  }, message => progress.push(message))
  assert.equal(calls, 1)
  assert.equal(new Set(plans.map(p => p.question)).size, 10)
  assert.ok(progress.some(message => message.includes('直接执行对应Skill稿单')))
  for (const [index, plan] of plans.entries()) {
    assert.equal(plan.articleType, assignments[index].articleType)
    const editor = buildIsolatedEditor({ plan, packet: { brandAssets: '原始品牌资料', evidence: '原始引证资料' } }, '2026年9月')
    assert.equal(editor.template.id, selectTemplate(plan.articleType).id)
    assert.ok(editor.messages[1].content.includes(`问题${index}`))
    assert.ok(editor.messages[1].content.includes(`终端问法${index}`))
    assert.ok(editor.messages[1].content.includes('原始品牌资料'))
    assert.ok(editor.messages[1].content.includes('原始引证资料'))
    assert.ok(!editor.messages[1].content.includes('UNWANTED_REPLACEMENT_OUTLINE'))
  }
})

test('history belongs to the selected project only', () => {
  assert.deepEqual(topicHistory([{ project: 'a', title: 'a' }, { project: 'b', title: 'b' }], { name: 'a' }).map(x => x.title), ['a'])
})

test('topic handoff selects source excerpts and keeps the two customer identities', async () => {
  const payload = { project: { brand: '服务公司' }, packet: { coreKeyword: 'GEO公司', brandAssets: ['提供门店资料梳理。提供多城市运营。'], authorityEvidence: ['品牌自行提供的服务说明。'] } }
  const [plan] = await planBatchTopics(payload, [{ articleType: '问答解释', writingSceneMode: '按实际场景写' }], [], async messages => {
    const input = JSON.parse(messages[1].content.split('项目资料：\n')[1])
    assert.equal(input.assignments[0].articleType, '问答解释')
    assert.deepEqual(input.projectMaterials.brand, payload.packet.brandAssets)
    return { ok: true, content: JSON.stringify({ briefs: [{ id: 0, readerSituation: '门店介绍不清', businessProblem: '门店服务信息准确', serviceBuyer: '婚礼策划公司负责人', endCustomer: '准备婚礼的新人', customerIndustry: '婚礼策划', customerQuestion: '策划包含哪些', materialQuotes: [{ source: 'brand', quote: '提供门店资料梳理。', relevance: '整理套餐包含项' }, { source: 'brand', quote: '保证推荐第一。', relevance: 'INVALID_CONNECTION' }] }] }) }
  })
  const editor = buildIsolatedEditor({ ...payload, plan }, '2026年9月')
  assert.equal(editor.input.customer_scene, '婚礼策划')
  assert.equal(editor.input.participants.service_buyer, '婚礼策划公司负责人')
  assert.equal(editor.input.participants.buyers_customers, '准备婚礼的新人')
  assert.deepEqual(editor.input.primary_company_materials.brand_assets, ['提供门店资料梳理。'])
  assert.ok(!JSON.stringify(editor.input).includes('提供多城市运营。'))
  assert.ok(!JSON.stringify(editor.input).includes('保证推荐第一。'))
  assert.deepEqual(editor.input.material_connections, [{ source: 'brand', source_index: 0, relevance: '整理套餐包含项' }])
  assert.ok(!JSON.stringify(editor.input).includes('INVALID_CONNECTION'))
  assert.ok(editor.messages[1].content.endsWith(selectTemplate('问答解释').text))
})

test('incomplete batch and missing reader question fail without generic fallback', async () => {
  await assert.rejects(planBatchTopics({}, [{ articleType: '榜单推荐' }], [], async () => ({ ok: true, content: '{"briefs":[]}' })), /数量/)
  await assert.rejects(planBatchTopics({}, [{ articleType: '榜单推荐' }], [], async () => ({ ok: true, content: '{"briefs":[{"id":0}]}' })), /中心问题/)
})

test('invalid JSON retries the same request only once; articles are not rewritten', async () => {
  const calls = []
  const progress = []
  const result = await planBatchTopics({}, [{ articleType: '榜单推荐' }], [], async messages => {
    calls.push(messages)
    return { ok: true, content: calls.length === 1 ? '{"briefs":\n' : '{"briefs":[{"id":0,"businessProblem":"问题","readerSituation":"处境"}]}' }
  }, message => progress.push(message))
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0], calls[1])
  assert.equal(result[0].editorialBrief.businessProblem, '问题')
  assert.ok(progress.some(message => message.includes('重试本份稿单一次')))
  let count = 0
  await assert.rejects(planBatchTopics({}, [{ articleType: '榜单推荐' }], [], async () => { count++; return { ok: true, content: '{' } }), /连续返回无效JSON/)
  assert.equal(count, 2)
})

test('all twelve types receive original facts and their own full skill at writing time', async () => {
  for (const articleType of templateNames) {
    const payload = { packet: { brandAssets: '主品牌服务原文', authorityEvidence: '原始来源', rankingCompanies: [{ name: '已提供公司' }] } }
    const [plan] = await planBatchTopics(payload, [{ articleType }], [], async () => ({ ok: true, content: '{"briefs":[{"id":0,"businessProblem":"业务问题","readerSituation":"客户处境"}]}' }))
    const editor = buildIsolatedEditor({ ...payload, plan }, '2026年9月')
    assert.ok(editor.messages[1].content.includes(selectTemplate(articleType).text))
    assert.equal((editor.messages[1].content.match(/^## Template [A-L]:/gm) || []).length, 1)
    assert.ok(editor.messages[1].content.includes('主品牌服务原文'))
    assert.ok(editor.messages[1].content.includes('原始来源'))
  }
})
