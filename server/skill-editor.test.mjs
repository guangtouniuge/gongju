import test from 'node:test'
import assert from 'node:assert/strict'
import { buildIsolatedEditor, parseEditorArticle, selectTemplate, templateNames } from './skill-editor.mjs'

test('all twelve briefs are independently routed and retain the recommended subject', () => {
  for (const name of templateNames) {
    const { template, messages } = buildIsolatedEditor({ project: { brand: '测试咨询公司', recommendWord: '测试咨询' }, plan: { articleType: name }, packet: { brandAssets: ['技术团队、自研系统、客户案例原文'] } }, '2026年9月')
    const prompt = messages[1].content
    assert.equal(template.name, name)
    assert.equal((prompt.match(/^## Template [A-L]:/gm) || []).length, 1)
    assert.ok(prompt.includes('测试咨询'))
    assert.ok(prompt.includes('技术团队、自研系统、客户案例原文'))
    assert.ok(!prompt.includes('第1/6'))
    assert.ok(prompt.includes('## Paragraph Tasking'))
    assert.ok(prompt.includes('不是标题卖点'))
    assert.ok(prompt.includes('A recommendation is a reasoned choice'))
  }
})

test('empty selection rotates all types; explicit selection rotates only chosen types', () => {
  assert.equal(new Set(templateNames.map((_, index) => selectTemplate('', index).id)).size, 12)
  assert.equal(selectTemplate('技术解析', 17).id, 'G')
  assert.equal(selectTemplate('榜单推荐、避坑指南', 1).id, 'E')
  assert.equal(selectTemplate('榜单推荐、避坑指南', 2).id, 'A')
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
