import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('server active path delegates to sealed engine', () => {
  const source = fs.readFileSync(new URL('./geo-api-server.mjs', import.meta.url), 'utf8')
  const active = source.slice(source.indexOf('async function generateFreeWritingArticle(payload'), source.indexOf('async function legacyGenerateFreeWritingArticle('))
  assert.ok(active.includes('return runWritingEngine('))
  assert.ok(!/cleanProduction|repair|callQwen\(/.test(active))
  assert.ok(source.includes('production: firstDraft.production'))
})

test('host inserts images without applying legacy title stripping to the parsed body', () => {
  const source = fs.readFileSync(new URL('./geo-api-server.mjs', import.meta.url), 'utf8')
  const start = source.lastIndexOf('const fallbackTitle = nextBody.plan.title')
  assert.ok(start > 0)
  const storing = source.slice(start, source.indexOf('const articleJobs = new Map()', start))
  assert.ok(storing.includes('insertGalleryImagesIntoArticle(rawBody,'))
  assert.doesNotMatch(storing, /stripFreeArticleTitle|cleanProduction|repairArticle/)
  assert.ok(storing.includes('body: rawBody'))
})
