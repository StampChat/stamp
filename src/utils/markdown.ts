import * as marked from 'marked'
import DOMPurify from 'dompurify'

import { colors } from 'quasar'
const { getPaletteColor } = colors

export function renderMarkdown(input: string, linkColor: boolean) {
  const renderer = new marked.Renderer()
  // linkColor boolean is true if dark, false otherwise
  const linkColorName = linkColor ? 'blue-2' : 'blue'
  const linkColorHex = getPaletteColor(linkColorName)
  renderer.link = (href, title, text) => {
    let link = '<a target="_blank" '
    // link
    link += 'href="' + href + '" '
    // style
    link += 'style="color: ' + linkColorHex + '" '
    // Close a tag and return with text
    return link + '>' + text + '</a>'
  }
  renderer.blockquote = text => {
    return (
      '<div class="quote" style="border-left: 2px solid; padding-left:8px; margin-left: 4px;">' +
      text +
      '</div>'
    )
  }
  return DOMPurify.sanitize(marked.marked(input, { renderer: renderer }), {
    ADD_ATTR: ['target'],
    RETURN_DOM: false,
  })
}

export function purify(input: string) {
  return DOMPurify.sanitize(input)
}
