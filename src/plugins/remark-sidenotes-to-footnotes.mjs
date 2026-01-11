import {visit} from 'unist-util-visit'

/**
 * Remark plugin that converts sidenote syntax to footnote syntax
 *
 * Converts:
 *   [>id] -> [^id]
 *   [>id]: content -> [^id]: content
 *   [>_id] -> [^id] (unnumbered sidenotes become regular footnotes)
 *   [>_id]: content -> [^id]: content
 *
 * This allows blog posts with sidenote syntax to render as footnotes in docs
 */
export function remarkSidenotesToFootnotes() {
  return (tree) => {
    // Convert sidenote definition paragraphs to footnote definitions
    const definitionRegex = /^\[>(\_)?([^\]]+)\]:\s*/

    visit(tree, 'paragraph', (node) => {
      if (!node.children || node.children.length === 0) return

      const firstChild = node.children[0]
      if (firstChild.type !== 'text') return

      const match = firstChild.value.match(definitionRegex)
      if (!match) return

      const id = match[2]
      // Replace [>id]: or [>_id]: with [^id]:
      firstChild.value = firstChild.value.replace(definitionRegex, `[^${id}]: `)
    })

    // Convert sidenote references in text to footnote references
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || !node.value) return

      // Match [>id] or [>_id] and convert to [^id]
      const pattern = /\[>_?([^\]]+)\]/g

      if (pattern.test(node.value)) {
        node.value = node.value.replace(pattern, '[^$1]')
      }
    })
  }
}
