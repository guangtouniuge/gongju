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
