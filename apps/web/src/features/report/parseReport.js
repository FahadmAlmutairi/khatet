// Splits the AI report text into sections of paragraphs and bullet lists (US-31).
export function parseReport(content) {
  const sections = []
  let current = null
  for (const rawLine of (content ?? '').split('\n')) {
    const line = rawLine.trim()
    const heading = line.match(/^#{1,6}\s+(.*)$/)
    if (heading) {
      current = { heading: heading[1].trim(), blocks: [] }
      sections.push(current)
      continue
    }
    if (!line) continue
    if (!current) {
      current = { heading: null, blocks: [] }
      sections.push(current)
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/) ?? line.match(/^\d+[.)]\s+(.*)$/)
    const last = current.blocks.at(-1)
    if (bullet) {
      if (last?.type === 'list') last.items.push(bullet[1])
      else current.blocks.push({ type: 'list', items: [bullet[1]] })
    } else if (last?.type === 'paragraph') {
      last.text += ` ${line}`
    } else {
      current.blocks.push({ type: 'paragraph', text: line })
    }
  }
  return sections
}
