export default function AuthLayout({ step, title, children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="bg-white px-6 py-5 sm:px-12">
        <p className="text-2xl font-bold text-heading">khatet</p>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
        <section className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
          {step && <p className="text-xs font-semibold uppercase tracking-wide text-muted">{step}</p>}
          <h1 className="mt-2 text-2xl font-semibold text-heading">{title}</h1>
          {children}
        </section>
      </main>
    </div>
  )
}

// Explains how the sample sign-in works until Supabase Auth is connected.
export function SampleSignInNote() {
  return (
    <p className="mt-6 rounded-lg bg-surface px-3 py-2.5 text-sm text-muted">
      <strong className="font-semibold text-heading">Sample data.</strong> Use fahad@example.com and any 6 digits. 000000
      shows the wrong-code message and 111111 the expired one. Any other email creates a new account.
    </p>
  )
}
