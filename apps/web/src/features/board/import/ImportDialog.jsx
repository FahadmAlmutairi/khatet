import { useEffect, useId, useRef, useState } from 'react'
import Dialog, { MobileBackBar } from '../../../components/ui/Dialog.jsx'
import ImportMappingStep from './ImportMappingStep.jsx'
import ImportPreviewStep from './ImportPreviewStep.jsx'
import ImportUploadStep from './ImportUploadStep.jsx'

const STEPS = ['Upload', 'Match columns', 'Check rows', 'Import']

// US-33: the owner imports tasks from a CSV file in four steps (docs/api-contract.md, Import
// contract). Each step asks the API again with the file's text, so nothing is kept on the
// server between steps and closing the dialog at any point creates nothing.
// A centred window from sm up and a full page on phones, like Create task.
export default function ImportDialog({ open, onClose, projectId }) {
  const [step, setStep] = useState(0)
  const [upload, setUpload] = useState(null)
  const [mapping, setMapping] = useState(null)
  const [result, setResult] = useState(null)
  const headingRef = useRef(null)
  const headingId = useId()
  const moved = useRef(false)

  // Each new step moves focus to its heading, so a screen reader starts reading there.
  useEffect(() => {
    if (moved.current) headingRef.current?.focus()
    moved.current = false
  }, [step])

  function go(next) {
    moved.current = true
    setStep(next)
  }

  function close() {
    setStep(0)
    setUpload(null)
    setMapping(null)
    setResult(null)
    onClose()
  }

  const shared = { projectId, headingRef, headingId }

  return (
    <Dialog open={open} onClose={close} variant="page" labelledBy={headingId} width={640}>
      <MobileBackBar label="Board" onBack={close} title="Import tasks" />
      <div className="flex flex-col gap-5 px-5 pt-3 pb-6 sm:p-6">
        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Import steps">
          {STEPS.map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? 'step' : undefined}
              className={`flex items-center gap-1.5 ${index === step ? 'font-semibold text-heading' : index < step ? 'text-body' : 'text-muted'}`}
            >
              <span
                aria-hidden="true"
                className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${
                  index === step ? 'bg-action text-white' : index < step ? 'bg-nav-active text-heading' : 'border border-line'
                }`}
              >
                {index + 1}
              </span>
              <span>
                <span className="sr-only">Step {index + 1} of {STEPS.length}: </span>
                {label}
              </span>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <ImportUploadStep
            {...shared}
            current={upload}
            onCancel={close}
            onUploaded={(next) => {
              // A new file starts the matches again; the same file keeps them.
              if (next !== upload) setMapping(null)
              setUpload(next)
              go(1)
            }}
          />
        )}
        {step === 1 && upload && (
          <ImportMappingStep
            {...shared}
            upload={upload}
            initialMapping={mapping}
            onBack={(chosen) => {
              setMapping(chosen)
              go(0)
            }}
            onPreviewed={(next, chosen) => {
              setMapping(chosen)
              setResult(next)
              go(2)
            }}
          />
        )}
        {step === 2 && result && <ImportPreviewStep {...shared} result={result} onBack={() => go(1)} />}
      </div>
    </Dialog>
  )
}
