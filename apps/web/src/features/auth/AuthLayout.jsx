import { useDocumentTitle } from '../../app/pageMeta.js'
import Logo from '../../components/Logo.jsx'
import { Link } from 'react-router'

// Figma: Sign in 946:1624, Verify 946:1634, Username 946:1646 (desktop) and 778:94, 778:66, 954:774 (mobile).
export default function AuthLayout({ title, children, after }) {
  useDocumentTitle(title)
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="flex h-16 items-center bg-white px-5 sm:h-[72px] sm:px-16">
        <Link to="/" className="inline-flex min-h-11 items-center rounded-md" aria-label="Khatet home">
          <Logo label="" />
        </Link>
      </header>
      <main id="main" className="flex flex-1 flex-col items-center justify-start px-5 py-12 sm:justify-center sm:px-4 sm:py-10">
        {/* Mobile drops the card and sits on the page background (Figma 778:94). */}
        <section className="flex w-full max-w-[440px] flex-col gap-6 sm:rounded-dialog sm:border sm:border-line sm:bg-white sm:p-10 sm:shadow-[0_2px_8px_rgba(48,64,54,0.05)]">
          <h1 className="text-[26px] leading-tight font-bold text-body sm:text-xl sm:leading-[26px] sm:font-semibold">{title}</h1>
          {children}
        </section>
        {after}
      </main>
    </div>
  )
}
