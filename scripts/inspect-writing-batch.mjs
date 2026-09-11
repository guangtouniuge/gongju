import fs from 'node:fs/promises'
import path from 'node:path'
import { marked } from 'marked'

const directory = process.argv[2]
if (!directory) throw new Error('Provide a test output directory')
const articles = JSON.parse(await fs.readFile(path.join(directory, 'results.json'), 'utf8'))
const tokens = text => marked.lexer(text)
const plain = value => String(value || '').replace(/[#*_`\s]/g, '')
const escaped = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const paragraphOwners = new Map()
const rows = articles.map((article, index) => {
  if (!article.ok) return { index: index + 1, ok: false, error: article.error }
  const parsed = tokens(article.body)
  for (const token of parsed.filter(t => t.type === 'paragraph')) {
    const key = plain((token.tokens || []).filter(item => item.type !== 'image').map(item => item.raw).join(''))
    if (key.length < 60) continue
    const owners = paragraphOwners.get(key) || new Set()
    owners.add(index + 1)
    paragraphOwners.set(key, owners)
  }
  const headings = parsed.filter(t => t.type === 'heading').map(t => ({ depth: t.depth, text: t.text }))
  const providers = headings.filter(h => /第[1-9一二三四五六七八九]名/.test(h.text))
  return { index: index + 1, ok: true, template: article.production.template, version: article.production.version, title: article.title,
    hanCharacters: (article.body.match(/\p{Script=Han}/gu) || []).length,
    textCharacters: article.body.replace(/\s/g, '').length,
    opening: parsed.find(t => t.type === 'paragraph')?.text,
    providerHeadings: providers, headings, file: `${index + 1}-${article.production.template}.html` }
})
const duplicateParagraphs = [...paragraphOwners.entries()].filter(([, owners]) => owners.size > 1).map(([text, owners]) => ({ articles: [...owners], text }))
await fs.writeFile(path.join(directory, 'inspection.json'), JSON.stringify({ rows, duplicateParagraphs }, null, 2))
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>API原稿对照</title><style>body{font:16px/1.7 system-ui;margin:32px auto;padding:0 20px;max-width:1080px;color:#222}h1{font-size:26px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;text-align:left;padding:12px 8px}a{color:#1659bd}small{color:#666}td:first-child{white-space:nowrap}</style><h1>API原稿对照</h1><p>原始正文未改写。字数为正文汉字计数，不含数字、英文和标点；不是引用评分。</p><table><thead><tr><th>类型</th><th>文章</th><th>汉字数</th></tr></thead><tbody>${rows.map(r => `<tr><td>${escaped(r.template || '失败')}</td><td>${r.ok ? `<a href="${escaped(r.file)}">${escaped(r.title)}</a>` : escaped(r.error)}</td><td>${r.hanCharacters || '-'}</td></tr>`).join('')}</tbody></table></html>`
await fs.writeFile(path.join(directory, 'index.html'), html)
console.log(JSON.stringify({ articles: rows.length, complete: rows.filter(r => r.ok).length, duplicateParagraphs: duplicateParagraphs.length, outline: rows.map(r => ({ index: r.index, type: r.template, words: r.hanCharacters, providers: r.providerHeadings?.map(h => `${h.depth}:${h.text}`) })) }, null, 2))
