// US-33: the task fields a CSV column can fill, in the order the mapping step lists them
// (docs/api-contract.md, Import contract). Phase joins the list once the US-20 routes are live.
export const IMPORT_FIELDS = [
  { value: 'title', label: 'Title', hint: 'Required' },
  { value: 'description', label: 'Description' },
  { value: 'status', label: 'Status', hint: 'Backlog, To Do, In Progress, Ready for Review or Done' },
  { value: 'priority', label: 'Priority', hint: 'Low, Medium or High' },
  { value: 'dueDate', label: 'Due date', hint: 'YYYY-MM-DD' },
  { value: 'assignees', label: 'Assignees', hint: 'Usernames separated by commas' },
]

export const fieldLabel = (value) => IMPORT_FIELDS.find((field) => field.value === value)?.label ?? value

export const MAX_IMPORT_BYTES = 1_000_000

// The same checks the API makes, so the owner sees a problem before anything is sent.
// Returns one message per column that has a problem, and a message for the whole mapping.
export function mappingProblems(mapping, columns) {
  const columnErrors = {}
  const firstColumn = {}
  mapping.forEach((field, index) => {
    if (!field) return
    if (field in firstColumn) {
      columnErrors[index] = `${fieldLabel(field)} is already filled by “${columns[firstColumn[field]]}”. Choose another field or Ignore.`
    } else {
      firstColumn[field] = index
    }
  })
  const missingTitle = !mapping.includes('title')
  return { columnErrors, missingTitle, hasProblems: missingTitle || Object.keys(columnErrors).length > 0 }
}

// A small file the owner can download and fill in, with every field the import reads.
export const EXAMPLE_CSV = [
  'Title,Description,Status,Priority,Due date,Assignees',
  'Write the project charter,Goals and scope for the first meeting,Done,High,2026-12-01,',
  'Design the login screen,,In Progress,Medium,2026-12-04,',
  'Collect user feedback,Ask five classmates to try the board,To Do,Low,,',
].join('\r\n')
