import marked from 'marked'
const renderer = new marked.Renderer()
renderer.link = (href, title, text) => {
  return '<a target="_blank" href="' + href + '" title="' + title + '">' + text + '</a>'
}

export { marked, renderer }
