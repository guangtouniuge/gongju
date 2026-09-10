import fs from 'node:fs'
const path = '.tmp/live-skill-release/src/main.tsx'
let live = fs.readFileSync(path, 'utf8')
const old = '<pre>{previewArticle.body}</pre>'
if (!live.includes(old)) throw new Error('Live article preview not found; do not patch unknown layout')
live = live.replace(old, '<div className="article-formatted-block" dangerouslySetInnerHTML={{ __html: articleHtml(previewArticle.body) }} />')
live = live.replace('<pre>{currentArticle.body}</pre>', '<div className="article-formatted-block" dangerouslySetInnerHTML={{ __html: articleHtml(currentArticle.body) }} />')
if (!live.includes("import { articleHtml }")) live = "import { articleHtml } from './article-format'\n" + live
fs.writeFileSync(path, live)
fs.copyFileSync('src/article-format.ts', '.tmp/live-skill-release/src/article-format.ts')
fs.copyFileSync('src/article-format.css', '.tmp/live-skill-release/src/article-format.css')
