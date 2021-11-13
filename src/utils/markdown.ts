import marked from 'marked'
const renderer = new marked.Renderer()
renderer.link = (href, title, text) => {
  return '<a target="_blank" href="' + href + '">' + text + '</a>'
}
import DOMPurify from 'dompurify'

export function toMarkdown (input: string) {
  return DOMPurify.sanitize(marked(input, { renderer: renderer }), { ADD_ATTR: ['target'] })
}
