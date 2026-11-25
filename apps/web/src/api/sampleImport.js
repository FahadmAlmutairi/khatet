// US-33: the sample server's copy of the import rules in apps/api/src/imports (csv.js and
// importRows.js), so the import dialog behaves the same on sample data as on the live API.
// Keep the two in step: the API is the one that counts.
export function detectSeparator(text) {
  let commas = 0
  let semicolons = 0
  let quoted = false
  for (const char of text) {
    if (char === '"') quoted = !quoted
    else if (!quoted && (char === '\n' || char === '\r')) break
    else if (!quoted && char === ',') commas += 1
    else if (!quoted && char === ';') semicolons += 1
  }
  return semicolons > commas ? ';' : ','
}

export function parseCsv(input) {
  const text = String(input ?? '').replace(/^\uFEFF/, '')
  const separator = detectSeparator(text)
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  let unclosed = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"' && cell === '') {
      quoted = true
    } else if (char === separator) {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  if (quoted) unclosed = true
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return { rows, separator, unclosed }
}

// The longest description a task can have (apps/api/src/lib/errors.js).
export const MAX_TEXT_LENGTH = 5000

export const MAX_FILE_CHARACTERS = 1_000_000
export const MAX_ROWS = 500
export const MAX_COLUMNS = 50

// The task fields a column can fill, in the order the mapping step lists them.
export const IMPORT_FIELDS = ['title', 'description', 'status', 'priority', 'dueDate', 'assignees']

// Header words that suggest a field, compared without case, spaces or punctuation.
const HEADER_WORDS = {
  title: ['title', 'task', 'taskname', 'name', 'summary', 'subject'],
  description: ['description', 'details', 'notes', 'desc', 'body'],
  status: ['status', 'stage', 'column', 'state', 'list'],
  priority: ['priority', 'importance'],
  dueDate: ['duedate', 'due', 'deadline', 'enddate', 'date'],
  assignees: ['assignees', 'assignee', 'assignedto', 'owner', 'owners', 'members', 'username', 'usernames', 'people'],
}

const STATUS_WORDS = {
  backlog: 'BACKLOG',
  todo: 'TODO',
  inprogress: 'IN_PROGRESS',
  doing: 'IN_PROGRESS',
  readyforreview: 'READY_FOR_REVIEW',
  review: 'READY_FOR_REVIEW',
  inreview: 'READY_FOR_REVIEW',
  done: 'DONE',
  complete: 'DONE',
  completed: 'DONE',
}

const PRIORITY_WORDS = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH' }

const squash = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

// The file's first line names the columns; the other lines are rows. Lines with no text at
// all are left out. Problems with the file as a whole are field errors on `csv`.
export function readTable(parsed, text) {
  const errors = []
  if (typeof text !== 'string' || !text.trim()) errors.push('Choose a CSV file with a header line and at least one row.')
  else if (text.length > MAX_FILE_CHARACTERS) errors.push('The file is too large. Keep it under 1 MB.')
  else if (parsed.unclosed) errors.push('The file has a quote (") that is never closed. Check the file and try again.')
  if (errors.length) return { errors }

  const [header = [], ...lines] = parsed.rows
  const columns = header.map((name, index) => name.trim() || `Column ${index + 1}`)
  const rows = lines
    .map((cells, index) => ({ line: index + 2, cells }))
    .filter((row) => row.cells.some((cell) => cell.trim() !== ''))

  if (!header.some((name) => name.trim())) errors.push('The first line must name the columns.')
  else if (columns.length > MAX_COLUMNS) errors.push(`The file has more than ${MAX_COLUMNS} columns.`)
  else if (rows.length === 0) errors.push('The file has a header line but no rows.')
  else if (rows.length > MAX_ROWS) errors.push(`The file has ${rows.length} rows. Import at most ${MAX_ROWS} at a time.`)
  return { columns, rows, errors }
}

// A field for each column, by its header, each field at most once (the first column wins).
export function suggestMapping(columns) {
  const used = new Set()
  return columns.map((name) => {
    const word = squash(name)
    const field = IMPORT_FIELDS.find((key) => !used.has(key) && HEADER_WORDS[key].includes(word))
    if (!field) return null
    used.add(field)
    return field
  })
}

// The owner's choices: one entry per column, a field name or null to ignore that column.
// Title must be chosen exactly once, and no field twice.
export function checkMapping(mapping, columns) {
  if (!Array.isArray(mapping) || mapping.length !== columns.length) {
    return 'Choose a field or "Ignore" for every column.'
  }
  if (mapping.some((field) => field !== null && !IMPORT_FIELDS.includes(field))) {
    return 'Choose a field or "Ignore" for every column.'
  }
  const chosen = mapping.filter(Boolean)
  if (!chosen.includes('title')) return 'Choose the column that holds the task title.'
  const twice = chosen.find((field, index) => chosen.indexOf(field) !== index)
  if (twice) return `Only one column can fill ${FIELD_LABELS[twice]}.`
  return null
}

export const FIELD_LABELS = {
  title: 'Title',
  description: 'Description',
  status: 'Status',
  priority: 'Priority',
  dueDate: 'Due date',
  assignees: 'Assignees',
}

// "2026-10-19" or "2026/10/19" -> "2026-10-19", or null when it is not a real calendar day.
function readDate(value) {
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(value)
  if (!match) return null
  const key = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
  const date = new Date(`${key}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(key) ? key : null
}

// One row: the values it will create and its problems. `members` maps a lower-case username
// to { id, username }; `importer` is the owner, who becomes the assignee when the row names nobody,
// the same as creating a task by hand needs at least one assignee.
export function readRow(row, mapping, { members, importer }) {
  const raw = {}
  mapping.forEach((field, index) => {
    if (field) raw[field] = (row.cells[index] ?? '').trim()
  })
  const errors = []
  const values = {
    title: raw.title ?? '',
    description: raw.description ?? '',
    status: 'TODO',
    priority: null,
    dueDate: null,
    assignees: [],
  }

  if (!values.title) errors.push({ field: 'title', message: 'The title is empty.' })
  else if (values.title.length > 200) errors.push({ field: 'title', message: 'The title is longer than 200 characters.' })
  if (values.description.length > MAX_TEXT_LENGTH) {
    errors.push({ field: 'description', message: `The description is longer than ${MAX_TEXT_LENGTH} characters.` })
  }

  if (raw.status) {
    const status = STATUS_WORDS[squash(raw.status)] ?? (Object.values(STATUS_WORDS).includes(raw.status.toUpperCase()) ? raw.status.toUpperCase() : null)
    if (status) values.status = status
    else errors.push({ field: 'status', message: `“${raw.status}” is not a status. Use Backlog, To Do, In Progress, Ready for Review or Done.` })
  }

  if (raw.priority) {
    const priority = PRIORITY_WORDS[squash(raw.priority)]
    if (priority) values.priority = priority
    else errors.push({ field: 'priority', message: `“${raw.priority}” is not a priority. Use Low, Medium or High.` })
  }

  if (raw.dueDate) {
    const dueDate = readDate(raw.dueDate)
    if (dueDate) values.dueDate = dueDate
    else errors.push({ field: 'dueDate', message: `“${raw.dueDate}” is not a date. Write it as YYYY-MM-DD, for example 2026-12-01.` })
  }

  const names = (raw.assignees ?? '')
    .split(/[;,|]/)
    .map((name) => name.trim().replace(/^@/, ''))
    .filter(Boolean)
  const unknown = []
  const ids = []
  const matched = []
  for (const name of names) {
    const member = members.get(name.toLowerCase())
    if (!member) unknown.push(name)
    else if (!ids.includes(member.id)) {
      ids.push(member.id)
      matched.push(member.username)
    }
  }
  if (unknown.length) {
    errors.push({
      field: 'assignees',
      message: `${unknown.join(', ')} ${unknown.length === 1 ? 'is not a member' : 'are not members'} of this project.`,
    })
  }
  values.assigneeIds = ids.length ? ids : [importer.id]
  values.assignees = ids.length ? matched : [importer.username]

  return { line: row.line, values, errors }
}
