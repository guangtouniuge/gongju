// Build a generation-only release for installations predating account migration.
import fs from 'node:fs'
const path = '.tmp/live-skill-release/server/geo-api-server.mjs'
let live = fs.readFileSync(path, 'utf8').replace(/^import .* from '\.\/skill-editor\.mjs'\r?\n/gm, '')
const current = fs.readFileSync('server/geo-api-server.mjs', 'utf8')
function copyFunction(start, next, replacementEnd) {
  const a = live.indexOf(start)
  const b = live.indexOf(next, a)
  const x = current.indexOf(start)
  const y = current.indexOf(replacementEnd, x)
  if ([a, b, x, y].some((index) => index < 0)) throw new Error(`Cannot locate ${start}`)
  live = live.slice(0, a) + current.slice(x, y) + live.slice(b)
}
copyFunction('async function generateFreeWritingArticle(payload', 'async function generateArticleFromPlan(', 'async function legacyGenerateFreeWritingArticle(')
copyFunction('async function callQwen(', 'function compactText(', 'function compactText(')
copyFunction('function buildServerArticlePlans(body)', 'function startArticleJob(', 'function legacyBuildServerArticlePlans(')
live = "import { buildIsolatedEditor, parseEditorArticle, selectTemplate } from './skill-editor.mjs'\n" + live
live = live.replace("firstDraft.ok ? cleanProductionArticleBody(firstDraft.body) : ''", "firstDraft.ok ? firstDraft.body : ''")
live = live.replace("cleanProductionArticleBody(firstDraft.body || '')", "firstDraft.body || ''")
live = live.replace(/const PROMPT_STACK_VERSION = '[^']*'/, "const PROMPT_STACK_VERSION = 'niuge-geo-skill-isolated-v3'")
fs.writeFileSync(path, live)
fs.copyFileSync('server/skill-editor.mjs', '.tmp/live-skill-release/server/skill-editor.mjs')
fs.cpSync('server/skills', '.tmp/live-skill-release/server/skills', { recursive: true })
console.log('Generation bridge built; existing account and data routes preserved.')
