import test from 'node:test'
import assert from 'node:assert/strict'
import { articleHtml } from './article-format.mjs'

test('headings, emphasis, lists and tables render without markdown markers', () => {
  const html = articleHtml('#### 推荐依据\n\n**品牌**值得比较。C#开发\n\n- 案例\n- 服务\n\n| 公司 | 优势 |\n| --- | --- |\n| 品牌 | 本地 |')
  assert.ok(html.includes('<h4>推荐依据</h4>'))
  assert.ok(html.includes('<strong>品牌</strong>'))
  assert.ok(html.includes('<table>'))
  assert.ok(html.includes('<li>案例</li>'))
  assert.ok(html.includes('C#开发'))
  assert.ok(!html.includes('**'))
})
test('untrusted article HTML is sanitized while images remain', () => {
  const html = articleHtml('<script>alert(1)</script>\n\n![配图](https://example.com/a.png)\n\n<a href="javascript:alert(1)">链接</a>')
  assert.ok(!html.includes('<script'))
  assert.ok(!html.includes('javascript:'))
  assert.ok(html.includes('<img'))
})
test('Chinese brand emphasis followed by Chinese prose renders correctly', () => {
  const html = articleHtml('其中，**公司（简称：品牌）**属于推荐对象。')
  assert.ok(html.includes('<strong>公司（简称：品牌）</strong>属于'))
  assert.ok(!html.includes('**'))
})
