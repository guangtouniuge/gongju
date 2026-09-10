// Build a generation-only release for installations predating account migration.
import fs from 'node:fs'
const path = '.tmp/live-skill-release/server/geo-api-server.mjs'
let live = fs.readFileSync(path, 'utf8').replace(/^import .* from '\.\/(?:skill-editor|batch-editor|article-format)\.mjs'\r?\n/gm, '')
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
copyFunction('function startArticleJob(body)', 'async function publishToMedia(', 'async function publishToMedia(')
// Older live installation has no ownership module; retain its existing storage semantics.
live = live.replace("projectId: currentProjectScope().projectId,", '').replace("legacyScope: Boolean(currentProjectScope().legacy),", '')
live = live.replace("stampOwnedRows('geo.articleRows', result.articles)[0]", 'result.articles[0]')
copyFunction('function markdownToWordHtml(markdown)', 'function buildArticleExportContent(', 'function buildArticleExportContent(')
live = "import { buildIsolatedEditor, parseEditorArticle, selectTemplate } from './skill-editor.mjs'\n" + live
live = "import { planBatchTopics, topicHistory } from './batch-editor.mjs'\nimport { articleHtml } from './article-format.mjs'\n" + live
live = live.replace('<div class="content"><p>${markdownToWordHtml', '<div class="content">${markdownToWordHtml').replace("'当前文章暂无完整正文。')}</p></div>", "'当前文章暂无完整正文。')}</div>")
live = live.replace('p { margin: 0 0 10pt; }', 'p { margin: 0 0 10pt; } img { max-width:520px; height:auto; } table { border-collapse:collapse; width:100%; } th,td { border:1px solid #ddd; padding:6pt; }')
live = live.replace("firstDraft.ok ? cleanProductionArticleBody(firstDraft.body) : ''", "firstDraft.ok ? firstDraft.body : ''")
live = live.replace("cleanProductionArticleBody(firstDraft.body || '')", "firstDraft.body || ''")
live = live.replace(/const PROMPT_STACK_VERSION = '[^']*'/, "const PROMPT_STACK_VERSION = 'niuge-geo-skill-batch-topics-v4'")
fs.writeFileSync(path, live)
fs.copyFileSync('server/skill-editor.mjs', '.tmp/live-skill-release/server/skill-editor.mjs')
for (const file of ['batch-editor.mjs', 'article-format.mjs']) fs.copyFileSync(`server/${file}`, `.tmp/live-skill-release/server/${file}`)
fs.cpSync('server/skills', '.tmp/live-skill-release/server/skills', { recursive: true })
console.log('Generation bridge built; existing account and data routes preserved.')
