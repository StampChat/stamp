import marked from 'marked'
import DOMPurify from 'dompurify'

export function renderMarkdown (input: string) {
  const renderer = new marked.Renderer()
  renderer.link = (href, title, text) => {
    return '<a target="_blank" href="' + href + '">' + text + '</a>'
  }
  return DOMPurify.sanitize(marked(input, { renderer: renderer }), { ADD_ATTR: ['target'], RETURN_DOM: false })
}
