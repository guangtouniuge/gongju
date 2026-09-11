export function modelRequestOptions(env, temperature, responseFormat) {
  const model = env.MODEL_NAME || env.QWEN_MODEL
  const maxTokens = Number(env.MODEL_MAX_TOKENS || env.QWEN_MAX_TOKENS || 8192)
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 65536) throw new Error('MODEL_MAX_TOKENS must be between 1 and 65536')
  const options = { model, temperature, max_tokens: maxTokens, ...(responseFormat ? { response_format: responseFormat } : {}) }
  if (env.MODEL_THINKING) {
    if (!['enabled', 'disabled'].includes(env.MODEL_THINKING)) throw new Error('Invalid MODEL_THINKING')
    if (!String(model).startsWith('deepseek-')) throw new Error('Thinking profile is configured for DeepSeek only')
    options.thinking = { type: env.MODEL_THINKING }
    if (env.MODEL_THINKING === 'enabled') {
      const effort = env.MODEL_REASONING_EFFORT || 'high'
      if (!['low', 'high', 'max'].includes(effort)) throw new Error('Invalid MODEL_REASONING_EFFORT')
      options.reasoning_effort = effort
      delete options.temperature
    }
  }
  return options
}
