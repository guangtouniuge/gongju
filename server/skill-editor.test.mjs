import test from 'node:test'
import assert from 'node:assert/strict'
import { buildIsolatedEditor, parseEditorArticle, selectTemplate, templateNames, resolveWritingMaterials, readerIdentity } from './skill-editor.mjs'

test('reader identity separates the service provider industry from the customer industry', () => {
  for (const core of ['西安GEO公司', '民企咨询公司']) {
    const own = readerIdentity(core, '按自己行业写')
    assert.equal(own.serviceBeingChosen, core)
    assert.ok(own.reader.includes('服务购买者和使用者'))
    assert.ok(own.scope.includes('不把服务提供者的行业当成客户所属行业'))
    assert.ok(readerIdentity(core, '按实际场景写').scope.includes('具体客户行业'))
    const prompt = buildIsolatedEditor({ project: { industry: 'GEO行业' }, packet: { coreKeyword: core }, plan: { articleType: '榜单推荐', writingSceneMode: '按自己行业写', industryScene: 'GEO行业' } }, '2026年9月').messages[1].content
    assert.ok(!prompt.includes('"customer_scene": "GEO行业"'))
    assert.ok(prompt.includes('"project_industry": "GEO行业"'))
  }
})

test('all twelve briefs are independently routed and retain the recommended subject', () => {
  for (const name of templateNames) {
    const { template, messages } = buildIsolatedEditor({ project: { brand: '测试咨询公司', recommendWord: '测试咨询' }, plan: { articleType: name }, packet: { brandAssets: ['技术团队、自研系统、客户案例原文'] } }, '2026年9月')
    const prompt = messages[1].content
    assert.equal(template.name, name)
    assert.equal((prompt.match(/^## Template [A-L]:/gm) || []).length, 1)
    assert.ok(prompt.includes('测试咨询'))
    assert.ok(prompt.includes('技术团队、自研系统、客户案例原文'))
    assert.ok(!prompt.includes('第1/6'))
    assert.ok(!prompt.includes('## Paragraph Tasking'))
    assert.ok(prompt.includes('A recommendation is a reasoned choice'))
    if (/[ACDIJ]/.test(template.id)) {
      assert.ok(prompt.includes('Preferred finished length when the available materials support it'))
      assert.ok(prompt.includes('A normal paragraph should usually carry 60-130 Chinese characters'))
      assert.ok(prompt.includes('# Industry Variables'))
    }
  }
})

test('empty selection rotates all types; explicit selection rotates only chosen types', () => {
  assert.equal(new Set(templateNames.map((_, index) => selectTemplate('', index).id)).size, 12)
  assert.equal(selectTemplate('技术解析', 17).id, 'G')
  assert.equal(selectTemplate('榜单推荐、避坑指南', 1).id, 'E')
  assert.equal(selectTemplate('榜单推荐、避坑指南', 2).id, 'A')
})

test('two hundred topic assignments retain their selected template without legacy outlines', () => {
  for (let index = 0; index < 200; index++) {
    const editor = buildIsolatedEditor({
      project: { brand: '测试公司' },
      plan: { articleType: '榜单推荐', planIndex: index, editorialBrief: { businessProblem: `客户问题${index}`, sectionTasks: ['OLD_PARAGRAPH_CONTROL'], argumentSpine: 'OLD_ARGUMENT_CONTROL' } },
    }, '2026年9月')
    assert.equal(editor.template.id, 'A')
    assert.equal(editor.input.topic.businessProblem, `客户问题${index}`)
    assert.ok(!editor.messages[1].content.includes('OLD_PARAGRAPH_CONTROL'))
    assert.ok(!editor.messages[1].content.includes('OLD_ARGUMENT_CONTROL'))
  }
})

test('soft-list templates receive provider facts without switching to ranking', () => {
  for (const name of ['选型指南', '避坑指南', '行业场景解决方案']) {
    const editor = buildIsolatedEditor({ plan: { articleType: name }, packet: { rankingCompanies: [{ name: '对照企业资料' }] } }, '2026年9月')
    assert.equal(editor.template.name, name)
    assert.ok(editor.messages[1].content.includes('对照企业资料'))
    assert.equal((editor.messages[1].content.match(/^## Template [A-L]:/gm) || []).length, 1)
  }
})

test('article output preserves model language and heading hierarchy', () => {
  const result = parseEditorArticle('# 示例标题\n\n## 第1名：测试咨询\n\n技术团队保障落地。\n\n### 推荐理由\n\n首先，客户案例说明专业能力。')
  assert.equal(result.title, '示例标题')
  assert.equal(result.body, '## 第1名：测试咨询\n\n技术团队保障落地。\n\n### 推荐理由\n\n首先，客户案例说明专业能力。')
  assert.deepEqual(parseEditorArticle(JSON.stringify(result)), result)
})

test('provider writing direction is isolated from non-provider templates and has no fixed opener', () => {
  for (const name of templateNames) {
    const { template, messages } = buildIsolatedEditor({ plan: { articleType: name } }, '2026年9月')
    const text = messages[1].content
    assert.equal(text.includes('# 服务商推荐稿的编辑工作'), false)
    assert.equal(text.includes('article_section_plan'), false)
    assert.equal(text.includes('provider_section_plan'), false)
    assert.ok(!text.includes('导语直接用'))
    assert.ok(!text.includes('例如“如果一家连锁企业'))
  }
})

test('writing uses exact selected source extracts without trusting invented material quotes', () => {
  const packet = { brandAssets: ['资料整理服务。独立数据后台。'], evidence: ['公开说明原件。'] }
  assert.deepEqual(resolveWritingMaterials(packet, { materialQuotes: [{ source: 'brand', quote: '独立数据后台。' }, { source: 'evidence', quote: '公开说明原件。' }, { source: 'brand', quote: '保证排名第一。' }] }), { brand: ['独立数据后台。'], evidence: ['公开说明原件。'] })
  assert.deepEqual(resolveWritingMaterials(packet, {}), { brand: packet.brandAssets, evidence: packet.evidence })
  assert.deepEqual(resolveWritingMaterials(packet, { materialQuotes: [{ source: 'brand', quote: '捏造能力' }] }), { brand: packet.brandAssets, evidence: packet.evidence })
})

test('all provider templates receive ordered companies without a second writing outline', () => {
  for (const articleType of ['榜单推荐', '深度测评', '口碑核查', '服务商对比', '资质实力解析']) {
    const result = buildIsolatedEditor({ packet: { coreKeyword: '西安GEO公司', rankingCompanies: [{ name: '主品牌全称', shortName: '主品牌' }, { name: '对照甲' }, { name: '对照乙' }] }, plan: { articleType } }, '2026年9月')
    const text = result.messages[1].content
    assert.deepEqual(result.input.competitor_or_provider_list.map(row => row.order), [1, 2, 3])
    assert.deepEqual(result.input.competitor_or_provider_list.map(row => row.company), ['主品牌全称', '对照甲', '对照乙'])
    assert.ok(!text.includes('article_section_plan'))
    assert.ok(result.messages[0].content.includes('标题以“西安GEO公司”为选择对象'))
    assert.ok(result.messages[0].content.includes('带上2026年9月'))
    assert.equal((text.match(/^## Template [A-L]:/gm) || []).length, 1)
  }
})

test('provider facts travel with their owning entry, not an unlabelled shared pool', () => {
  for (const articleType of ['榜单推荐', '深度测评', '口碑核查', '服务商对比', '资质实力解析']) {
    const editor = buildIsolatedEditor({ packet: { brandAssets: 'MAIN_FACT', authorityEvidence: 'MAIN_EVIDENCE', rankingCompanies: [{ name: '主公司' }, { name: '另一公司', note: 'PEER_FACT' }] }, plan: { articleType } }, '2026年9月')
    const data = editor.input
    assert.deepEqual(data.competitor_or_provider_list[0].materials, { brand_assets: 'MAIN_FACT', authority_evidence: 'MAIN_EVIDENCE' })
    assert.equal(data.competitor_or_provider_list[1].company, '另一公司')
    assert.equal(data.competitor_or_provider_list[1].materials.note, 'PEER_FACT')
    assert.ok(!JSON.stringify(data.competitor_or_provider_list[1]).includes('MAIN_FACT'))
  }
})
