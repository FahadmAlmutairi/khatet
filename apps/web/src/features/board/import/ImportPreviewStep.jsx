import Button from '../../../components/ui/Button.jsx'

// US-33 step 3: the rows the file will create. For now it shows the counts from the preview
// answer, so steps 1 and 2 can be checked end to end. The preview table with each row's
// problems, Confirm and Cancel (useConfirmImport) and the result screen (step 4) come next in
// this file, as split in plans/sprint4-plan.md.
export default function ImportPreviewStep({ result, headingRef, headingId, onBack }) {
  const { validCount, skippedCount, rows } = result
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-body outline-none sm:text-2xl">
          Check the rows
        </h2>
        <p role="status" className="text-sm text-muted">
          {validCount} of {rows.length} {rows.length === 1 ? 'row is' : 'rows are'} ready to import.
          {skippedCount > 0 && ` ${skippedCount} ${skippedCount === 1 ? 'row has' : 'rows have'} problems and will be skipped.`}
        </p>
      </div>
      <div className="mt-2 flex justify-end gap-3">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  )
}
