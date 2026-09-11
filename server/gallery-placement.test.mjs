import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const source = fs.readFileSync(new URL('./geo-api-server.mjs', import.meta.url), 'utf8')
const code = source.slice(source.indexOf('function insertGalleryImagesIntoArticle('), source.indexOf('function configured('))
const insert = new Function('parseGalleryImageItems', code + '\nreturn insertGalleryImagesIntoArticle;')(() => [{ label: '品牌', src: '/one' }, { label: '品牌', src: '/two' }])
test('brand images do not split provider headings or question-answer blocks', () => {
  const body = '导语。\n\n## 公司对比\n\n### 其他公司\n\n公司内容。\n\n## 问答\n\n问：如何选择？\n\n答：说明。\n\n## 总结\n\n结论。'
  const result = insert(body)
  assert.ok(result.body.includes('### 其他公司\n\n公司内容。'))
  assert.ok(result.body.includes('问：如何选择？\n\n答：说明。'))
  assert.ok(result.body.indexOf('](/one)') < result.body.indexOf('## 公司对比'))
  assert.ok(result.body.includes('](/two)\n\n## 总结'))
  assert.equal(result.imagePaths.length, 2)
})
test('article beginning with heading receives image before rather than inside its section', () => {
  assert.ok(insert('## 问答\n\n问：问题\n\n答：答案').body.startsWith('![品牌](/one)\n\n## 问答'))
})
