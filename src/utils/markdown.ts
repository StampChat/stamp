import marked from 'marked'
const renderer = new marked.Renderer()
renderer.link = (href, title, text) => {
  return '<a target="_blank" href="' + href + '">' + text + '</a>'
}

export { marked, renderer }
