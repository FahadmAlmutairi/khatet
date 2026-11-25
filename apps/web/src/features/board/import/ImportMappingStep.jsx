import { useId, useRef, useState } from 'react'
import { errorMessage, fieldError } from '../../../api/errors.js'
import { usePreviewImport } from '../../../api/hooks.js'
import Button from '../../../components/ui/Button.jsx'
import { FieldError } from '../../../components/ui/Field.jsx'
import { IMPORT_FIELDS, fieldLabel, mappingProblems } from './importFields.js'

const selectClass =
  'min-h-11 w-full rounded-lg border border-input bg-white px-3 text-base text-body sm:text-sm aria-[invalid=true]:border-2 aria-[invalid=true]:border-blocked'

// The first value in the sample rows for this column, so the owner sees what the column holds.
function exampleFor(sample, index) {
  return sample.map((row) => row[index]).find((value) => value) ?? ''
}

// US-33 step 2: one choice per column, a task field or Ignore. The suggested matches come
// first; title is required and no field can be chosen twice. A list of selects, not a wide
// table, so it works on a phone and by keyboard. Preview asks the API to check every row.
export default function ImportMappingStep({ projectId, upload, initialMapping, headingRef, headingId, onBack, onPreviewed }) {
  const { fileName, csv, table } = upload
  const preview = usePreviewImport(projectId)
  const [mapping, setMapping] = useState(initialMapping ?? table.suggestedMapping)
  const [showProblems, setShowProblems] = useState(false)
  const summaryRef = useRef(null)
  const summaryId = useId()
  const baseId = useId()

  const problems = mappingProblems(mapping, table.columns)
  const serverProblem = preview.isError
    ? fieldError(preview.error, 'mapping') ?? fieldError(preview.error, 'csv') ?? errorMessage(preview.error)
    : null
  const chosen = mapping.filter(Boolean).length

  function choose(index, value) {
    setMapping((current) => current.map((field, position) => (position === index ? value || null : field)))
    preview.reset()
  }

  function submit(event) {
    event.preventDefault()
    if (problems.hasProblems) {
      setShowProblems(true)
      setTimeout(() => summaryRef.current?.focus(), 0)
      return
    }
    preview.mutate({ csv, mapping }, { onSuccess: (result) => onPreviewed(result, mapping) })
  }

  // A field chosen twice shows at once, next to the second column; a missing title only after Next.
  const visibleColumnErrors = problems.columnErrors

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-body outline-none sm:text-2xl">
          Match the columns
        </h2>
        <p className="text-sm text-muted">
          <span className="font-medium text-body break-all">{fileName}</span> has {table.columns.length}{' '}
          {table.columns.length === 1 ? 'column' : 'columns'} and {table.rowCount} {table.rowCount === 1 ? 'row' : 'rows'}.
          Choose the task field each column fills. Columns we recognised are already matched.
        </p>
      </div>

      {showProblems && problems.hasProblems && (
        <div
          ref={summaryRef}
          id={summaryId}
          role="alert"
          tabIndex={-1}
          className="rounded-control border border-blocked bg-priority-high-bg/30 px-3.5 py-3 text-sm text-blocked outline-none"
        >
          <p className="font-semibold">Fix the matches to continue</p>
          <ul className="mt-1 list-disc pl-5 text-body">
            {problems.missingTitle && <li>Choose the column that holds the task title.</li>}
            {Object.keys(problems.columnErrors).length > 0 && <li>Each field can be filled by one column only.</li>}
          </ul>
        </div>
      )}

      <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-white" aria-label="Columns in the file">
        {table.columns.map((column, index) => {
          const selectId = `${baseId}-${index}`
          const example = exampleFor(table.sample, index)
          const columnError = visibleColumnErrors[index]
          return (
            <li key={selectId} className="flex flex-col gap-2 px-4 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] sm:items-center sm:gap-4">
              <div className="min-w-0">
                <label htmlFor={selectId} className="block text-sm font-medium break-words text-body">
                  {column}
                </label>
                <p id={`${selectId}-example`} className="truncate text-sm text-muted">
                  {example ? `For example: ${example}` : 'Empty in the first rows'}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <select
                  id={selectId}
                  value={mapping[index] ?? ''}
                  onChange={(event) => choose(index, event.target.value)}
                  aria-invalid={Boolean(columnError) || (showProblems && problems.missingTitle && !mapping[index]) ? true : undefined}
                  aria-describedby={columnError ? `${selectId}-error` : `${selectId}-example`}
                  className={selectClass}
                >
                  <option value="">Ignore this column</option>
                  {IMPORT_FIELDS.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                      {field.value === 'title' ? ' (required)' : ''}
                    </option>
                  ))}
                </select>
                {columnError && (
                  <FieldError id={`${selectId}-error`} role={null}>
                    {columnError}
                  </FieldError>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <p role="status" className="text-sm text-muted">
        {chosen === 0
          ? 'No column is matched yet.'
          : `${chosen} of ${table.columns.length} columns will be imported${
              mapping.includes('title') ? `, with titles from “${table.columns[mapping.indexOf('title')]}”` : ''
            }.`}
      </p>

      <details className="text-sm text-muted">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-action">What each field accepts</summary>
        <ul className="mt-1 flex flex-col gap-1 pl-1">
          {IMPORT_FIELDS.filter((field) => field.hint).map((field) => (
            <li key={field.value}>
              <span className="font-medium text-body">{fieldLabel(field.value)}:</span> {field.hint}
              {field.value === 'assignees' ? '. Empty means you.' : ''}
              {field.value === 'status' ? '. Empty means To Do.' : ''}
            </li>
          ))}
        </ul>
      </details>

      {serverProblem && <FieldError>{serverProblem}</FieldError>}

      <div className="mt-2 flex justify-end gap-3">
        <Button variant="secondary" onClick={() => onBack(mapping)}>
          Back
        </Button>
        <Button type="submit" loading={preview.isPending}>
          Next: check rows
        </Button>
      </div>
    </form>
  )
}
