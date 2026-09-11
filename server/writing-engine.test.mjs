import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runWritingEngine, writingRelease } from './writing-engine.mjs'
import { verifyWritingRelease } from './writing-release.mjs'
import { templateNames } from './skill-editor.mjs'

const payload = { project: { name: '测试项目', brand: '测试品牌', legacyPrompt: 'OLD_INJECTION' }, packet: { coreKeyword: '咨询公司' }, plan: { editorialBrief: { centralQuestion: '如何选择', readerSituation: '连锁企业', argumentSpine: '问题到能力到推荐' } } }
test('all twelve engine routes preserve the whole article with one writing call', async () => {
  for (const [index, articleType] of templateNames.entries()) {
    let calls = 0
    const body = '## 推荐依据\n\n一个问题。\n\n由此需要这种能力。'
    const result = await runWritingEngine({ ...payload, plan: { ...payload.plan, articleType } }, {
      date: '2026年9月', model: 'test-model', callModel: async messages => {
        calls++
        const prompt = messages[1].content
        assert.equal((prompt.match(/^## Template [A-L]:/gm) || []).length, 1)
        assert.equal((prompt.match(/^- [A-L]:/gm) || []).length, 1)
        assert.ok(!prompt.includes('OLD_INJECTION'))
        return { ok: true, content: JSON.stringify({ title: '测试标题', body }) }
      },
    })
    assert.equal(calls, 1)
    assert.equal(result.body, body)
    assert.equal(result.production.template, String.fromCharCode(65 + index))
    assert.equal(result.production.version, writingRelease.version)
    assert.equal(result.production.promptHash.length, 64)
  }
})

test('single article without a brief plans first and never repairs model output', async () => {
  let calls = 0
  const result = await runWritingEngine({ ...payload, plan: { articleType: '榜单推荐' } }, {
    date: '2026年9月', model: 'test', callModel: async () => {
      calls++
      if (calls === 1) return { ok: true, content: JSON.stringify({ briefs: [{ id: 0, ...payload.plan.editorialBrief }] }) }
      return { ok: false, error: 'transport failure' }
    },
  })
  assert.equal(calls, 2)
  assert.equal(result.ok, false)
  assert.equal(result.error, 'transport failure')
})

test('truncated transport is not silently stored as a complete article', async () => {
  const result = await runWritingEngine(payload, { date: '2026年9月', model: 'test', callModel: async () => ({ ok: true, content: '{', raw: { choices: [{ finish_reason: 'length' }] } }) })
  assert.equal(result.ok, false)
  assert.match(result.error, /长度上限/)
})

test('release detects altered production files, without checking article scores', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'geo-seal-'))
  try {
    const manifest = JSON.parse(fs.readFileSync(new URL('./writing-release.json', import.meta.url)))
    fs.writeFileSync(path.join(temp, 'writing-release.json'), JSON.stringify(manifest))
    for (const file of Object.keys(manifest.files)) {
      fs.mkdirSync(path.dirname(path.join(temp, file)), { recursive: true })
      fs.copyFileSync(new URL(file, import.meta.url), path.join(temp, file))
    }
    const root = pathToFileURL(temp + path.sep)
    assert.equal(verifyWritingRelease(root).version, writingRelease.version)
    fs.appendFileSync(path.join(temp, 'skill-editor.mjs'), '\n// accidental legacy change\n')
    assert.throws(() => verifyWritingRelease(root), /integrity mismatch/)
  } finally { fs.rmSync(temp, { recursive: true, force: true }) }
})
