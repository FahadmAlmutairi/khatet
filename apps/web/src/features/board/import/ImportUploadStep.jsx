import { useId, useState } from 'react'
import { errorMessage, fieldError } from '../../../api/errors.js'
import { usePreviewImport } from '../../../api/hooks.js'
import Button from '../../../components/ui/Button.jsx'
import { FieldError } from '../../../components/ui/Field.jsx'
import { EXAMPLE_CSV, MAX_IMPORT_BYTES } from './importFields.js'

// Excel saves CSV files as text/csv, some systems as application/vnd.ms-excel or with no type,
// so the name decides.
function looksLikeCsv(file) {
  return /\.csv$/i.test(file.name) || file.type === 'text/csv'
}

function readText(file) {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

const exampleHref = `data:text/csv;charset=utf-8,${encodeURIComponent(EXAMPLE_CSV)}`

// US-33 step 1: choose a file. The browser reads it and the API answers its columns, a
// suggested field for each and a few sample rows. Nothing is saved.
// `current` is the file already read when the owner comes back from the next step; Next keeps it
// unless another file is chosen.
export default function ImportUploadStep({ projectId, current, headingRef, headingId, onCancel, onUploaded }) {
  const preview = usePreviewImport(projectId)
  const [file, setFile] = useState(null)
  const [problem, setProblem] = useState(null)
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()

  const error = problem ?? (preview.isError ? fieldError(preview.error, 'csv') ?? errorMessage(preview.error) : null)

  function choose(event) {
    setFile(event.target.files?.[0] ?? null)
    setProblem(null)
    preview.reset()
  }

  async function submit(event) {
    event.preventDefault()
    if (!file && current) return onUploaded(current)
    if (!file) return setProblem('Choose a CSV file.')
    if (!looksLikeCsv(file)) {
      return setProblem('Choose a file that ends in .csv. In Excel or Google Sheets, save or download the sheet as CSV first.')
    }
    if (file.size > MAX_IMPORT_BYTES) return setProblem('The file is too large. Keep it under 1 MB.')
    if (file.size === 0) return setProblem('The file is empty. Choose a CSV file with a header line and at least one row.')
    let csv
    try {
      csv = await readText(file)
    } catch {
      return setProblem('The file could not be read. Try choosing it again.')
    }
    preview.mutate({ csv }, { onSuccess: (table) => onUploaded({ fileName: file.name, csv, table }) })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-body outline-none sm:text-2xl">
          Upload a CSV file
        </h2>
        <p className="text-sm text-muted">
          The first line names the columns and each line after it becomes a task. You choose which column fills which field
          next, and nothing is saved until you confirm.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-body">
          CSV file
          <span aria-hidden="true" className="text-blocked"> *</span>
          <span className="sr-only"> (required)</span>
        </label>
        <input
          id={inputId}
          type="file"
          accept=".csv,text/csv"
          onChange={choose}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hintId}
          className="min-h-11 w-full rounded-lg border border-dashed border-input bg-white p-2 text-sm text-body file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-control file:border file:border-line file:bg-surface file:px-3 file:text-label file:font-medium file:text-heading hover:file:bg-surface-subtle aria-[invalid=true]:border-2 aria-[invalid=true]:border-solid aria-[invalid=true]:border-blocked"
        />
        {error ? (
          <FieldError id={errorId}>{error}</FieldError>
        ) : (
          <p id={hintId} className="text-sm text-muted">
            {current && !file ? (
              <>
                Using <span className="font-medium break-all text-body">{current.fileName}</span>. Choose another file to replace it.
              </>
            ) : (
              'Up to 500 tasks and 1 MB. Comma or semicolon separated.'
            )}
          </p>
        )}
      </div>

      <p className="text-sm text-muted">
        Not sure how to lay it out?{' '}
        <a href={exampleHref} download="khatet-import-example.csv" className="font-medium text-action underline underline-offset-2">
          Download an example file
        </a>
        .
      </p>

      <div className="mt-2 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={preview.isPending}>
          Next: match columns
        </Button>
      </div>
    </form>
  )
}
