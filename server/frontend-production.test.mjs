import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const source = fs.readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')

test('keyword preparation preserves customer questions without industry rewrites', () => {
  const body = source.slice(source.indexOf('function normalizeKeywordLibraryWords('), source.indexOf('type WorkflowPacket ='))
  const normalize = new Function(body.replace('words: string[]', 'words') + '; return normalizeKeywordLibraryWords;')()
  assert.deepEqual(normalize(['咨询费用，装修报价', ' 加盟 ', '是什么', 'HR', '咨询费用']), ['咨询费用', '装修报价', '加盟', '是什么', 'HR'])
})

test('frontend leaves editorial decisions to the API and preserves failed expansion input', () => {
  const planner = source.slice(source.indexOf('function buildArticlePlans('), source.indexOf('type LocalImageUpload ='))
  assert.ok(planner.includes("title: ''"))
  assert.ok(planner.includes("scene: ''"))
  for (const retired of ['ensureTitleHasCoreKeyword', 'buildPlanTitleFromIntent', 'workflowNewsAngles', 'GraphicWorkbench', 'buildExpandedWords']) assert.ok(!source.includes(retired), retired)
  const expand = source.slice(source.indexOf('  const generateCandidates ='), source.indexOf('  const saveCandidates ='))
  assert.ok(!expand.includes('localWords'))
  assert.ok(expand.includes('已保留当前内容'))
})
