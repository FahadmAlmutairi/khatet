import { Link } from 'react-router'

// Sentence case, earlier steps are links and the last one is the current page (G7).
export default function Breadcrumb({ items, className = '' }) {
  return (
    <nav aria-label="Breadcrumb" className={`min-w-0 ${className}`}>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs leading-4 font-medium text-muted">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${index}-${item.label}`} className="flex min-w-0 items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {last || !item.to ? (
                <span aria-current={last ? 'page' : undefined} className={`truncate ${last ? 'text-body' : ''}`}>
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className="inline-flex min-h-11 items-center truncate hover:text-heading hover:underline lg:min-h-6">
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
