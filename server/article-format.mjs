import { Marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

const marked = new Marked({ extensions: [{
  name: 'chineseStrong', level: 'inline',
  start: (src) => src.indexOf('**'),
  tokenizer(src) {
    const match = /^\*\*([^\n]+?)\*\*/.exec(src)
    if (match) return { type: 'chineseStrong', raw: match[0], tokens: this.lexer.inlineTokens(match[1]) }
  },
  renderer(token) { return `<strong>${this.parser.parseInline(token.tokens || [])}</strong>` },
}] })

export function articleHtml(body = '') {
  return sanitizeHtml(marked.parse(String(body), { async: false, breaks: true }), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt', 'width', 'height'] },
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  })
}
