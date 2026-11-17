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

// Which part of the page a heading belongs to. The prompt asks for these three
// (apps/api/src/ai/reportPrompt.js); any other heading is shown as it is.
export function sectionKind(heading) {
  const text = (heading ?? '').toLowerCase()
  if (text.includes('summary') || text.includes('progress')) return 'summary'
  if (text.includes('warning')) return 'warnings'
  if (text.includes('suggestion')) return 'suggestions'
  return 'other'
}

// "**Title**: detail" (prompt version 2) or "Title: detail" becomes { title, detail };
// anything else is all title.
export function splitItem(item) {
  const bold = item.match(/^\*\*(.+?)\*\*\s*[:.\-–]?\s*(.*)$/)
  if (bold) return { title: bold[1].trim(), detail: bold[2].trim() }
  const colon = item.match(/^([^:]{3,80}):\s+(.+)$/)
  if (colon) return { title: colon[1].trim(), detail: colon[2].trim() }
  return { title: item, detail: '' }
}

// The report as the page lays it out: summary paragraphs, then warning and suggestion items.
// A paragraph under Warnings such as "No warnings." means there are none.
export function reportParts(content) {
  const parts = { summary: [], warnings: [], suggestions: [], other: [] }
  for (const section of parseReport(content)) {
    const kind = section.heading ? sectionKind(section.heading) : 'summary'
    if (kind === 'other') {
      parts.other.push(section)
      continue
    }
    for (const block of section.blocks) {
      if (kind === 'summary') {
        if (block.type === 'paragraph') parts.summary.push(block.text)
        else parts.summary.push(...block.items)
      } else if (block.type === 'list') {
        parts[kind].push(...block.items.map(splitItem))
      } else if (!/^no (warnings|suggestions)\b/i.test(block.text)) {
        parts[kind].push({ title: block.text, detail: '' })
      }
    }
  }
  return parts
}
