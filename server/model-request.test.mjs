import test from 'node:test'
import assert from 'node:assert/strict'
import { modelRequestOptions } from './model-request.mjs'

test('existing models retain their original request options', () => {
  assert.deepEqual(modelRequestOptions({ QWEN_MODEL: 'qwen-max' }, 0.8), { model: 'qwen-max', temperature: 0.8, max_tokens: 8192 })
})
test('explicit DeepSeek profile reserves output budget for thinking and the full article', () => {
  const result = modelRequestOptions({ MODEL_NAME: 'deepseek-flash', MODEL_THINKING: 'enabled', MODEL_MAX_TOKENS: '24576' }, 0.8, { type: 'json_object' })
  assert.deepEqual(result, { model: 'deepseek-flash', max_tokens: 24576, thinking: { type: 'enabled' }, reasoning_effort: 'high', response_format: { type: 'json_object' } })
})
test('invalid profiles fail explicitly instead of silently changing model behaviour', () => {
  assert.throws(() => modelRequestOptions({ MODEL_MAX_TOKENS: 'NaN' }), /MODEL_MAX_TOKENS/)
  assert.throws(() => modelRequestOptions({ MODEL_NAME: 'qwen-max', MODEL_THINKING: 'enabled' }), /DeepSeek/)
})
