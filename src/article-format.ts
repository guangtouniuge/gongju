import { Marked } from 'marked'
import DOMPurify from 'dompurify'
import './article-format.css'

const marked = new Marked({ extensions: [{
  name: 'chineseStrong', level: 'inline',
  start: (src) => src.indexOf('**'),
  tokenizer(src) {
    const match = /^\*\*([^\n]+?)\*\*/.exec(src)
    if (match) return { type: 'chineseStrong', raw: match[0], tokens: this.lexer.inlineTokens(match[1]) }
  },
  renderer(token) { return `<strong>${this.parser.parseInline(token.tokens || [])}</strong>` },
}] })

export function articleHtml(body: string) {
  return DOMPurify.sanitize(marked.parse(body, { async: false, breaks: true }))
}
