import { buildIsolatedEditor, parseEditorArticle } from './skill-editor.mjs'
import { planBatchTopics } from './batch-editor.mjs'
import { contentHash, verifyWritingRelease } from './writing-release.mjs'

export const writingRelease = verifyWritingRelease()

export async function runWritingEngine(payload, { callModel, date, model, log = () => {} }) {
  try {
    const plan = payload.plan?.editorialBrief ? payload.plan : (await planBatchTopics(payload, [payload.plan || {}], payload.previousArticles || [], callModel))[0]
    const editor = buildIsolatedEditor({ ...payload, plan }, date)
    log(`${writingRelease.version} 独立稿单${editor.template.id}：整篇写作`)
    const response = await callModel(editor.messages, 0.8)
    if (!response.ok) return { ok: false, error: response.error || '写作接口失败' }
    if (response.raw?.choices?.[0]?.finish_reason === 'length') return { ok: false, error: '模型输出达到接口长度上限，未收到完整文章' }
    const article = parseEditorArticle(response.content)
    if (!article.title || !article.body) return { ok: false, error: '写作接口缺少标题或完整正文' }
    return {
      ok: true, ...article, editorialBrief: plan.editorialBrief,
      production: { ...writingRelease, template: editor.template.id, model, resolvedModel: response.raw?.model || model, date, promptHash: contentHash(JSON.stringify(editor.messages)) },
    }
  } catch (error) {
    return { ok: false, error: error.message || '写作接口异常' }
  }
}
