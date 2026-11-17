// US-25: a task mentioned in chat is stored in the message text as #[task:<taskId>]
// (docs/api-contract.md, Project chat). The message box shows "#Task title" instead, and the
// token is put in only when the message is sent.

const TOKEN = /#\[task:([^\]\s]+)\]/g

export function taskToken(taskId) {
  return `#[task:${taskId}]`
}

// The message as text parts and task parts, in order.
export function splitMessage(text) {
  const parts = []
  let last = 0
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) parts.push({ type: 'text', text: text.slice(last, match.index) })
    parts.push({ type: 'task', taskId: match[1] })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) })
  return parts
}

// Swaps each "#Task title" picked from the list for its token. A label the writer has since
// changed no longer matches and stays plain text. Longer labels go first, so "#Fix CSV" does not
// eat the start of "#Fix CSV validation errors".
export function encodeReferences(text, references) {
  const sorted = [...references].sort((a, b) => b.label.length - a.label.length)
  let result = text
  for (const { label, taskId } of sorted) result = result.split(`#${label}`).join(taskToken(taskId))
  return result
}

// The "#..." being typed just before the caret, if any: a # at the start or after a space,
// followed by up to 60 characters on the same line.
export function mentionAt(text, caret) {
  const before = text.slice(0, caret)
  const match = before.match(/(^|\s)#([^\n#]{0,60})$/)
  if (!match) return null
  return { start: caret - match[2].length - 1, query: match[2] }
}
