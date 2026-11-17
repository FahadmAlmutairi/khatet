// Shows the report text from the AI service as the Figma AI report screen lays it out:
// Summary, then Warnings and Suggestions as items with a title and a detail line.
// The text is turned into React elements, never into raw HTML, so nothing in it can run as code.
import { SparkleIcon, SummaryIcon, WarningIcon } from '../../components/icons.jsx'
import { reportParts } from './parseReport.js'

// **bold** is kept as bold; other markdown marks are shown as written.
function Inline({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={index} className="font-semibold text-heading">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
}

function Card({ tone = 'plain', icon, title, children }) {
  const toneClass = tone === 'warning' ? 'border-[#f0c7b9] bg-[#fdf3ef]' : 'border-line bg-white'
  const titleClass = tone === 'warning' ? 'text-blocked' : 'text-heading'
  return (
    <section className={`flex flex-col gap-3 rounded-xl border p-4 sm:p-5 ${toneClass}`}>
      <h2 className={`flex items-center gap-2 text-lg font-semibold ${titleClass}`}>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

function Items({ items }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, index) => (
        <li key={index} className="flex flex-col gap-0.5">
          <span className="text-base font-medium text-body">
            <Inline text={item.title} />
          </span>
          {item.detail && (
            <span className="text-sm leading-5 text-muted">
              <Inline text={item.detail} />
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function ReportContent({ content, snapshot = null }) {
  const parts = reportParts(content)
  return (
    <div className="flex flex-col gap-4">
      {parts.summary.length > 0 && (
        <Card icon={<SummaryIcon />} title="Summary">
          {parts.summary.map((text, index) => (
            <p key={index} className="text-base leading-relaxed text-body">
              <Inline text={text} />
            </p>
          ))}
        </Card>
      )}
      {snapshot}
      <Card tone={parts.warnings.length ? 'warning' : 'plain'} icon={<WarningIcon />} title={parts.warnings.length ? `Warnings · ${parts.warnings.length}` : 'Warnings'}>
        {parts.warnings.length ? <Items items={parts.warnings} /> : <p className="text-base text-body">No warnings.</p>}
      </Card>
      {parts.suggestions.length > 0 && (
        <Card icon={<SparkleIcon />} title="Suggestions">
          <Items items={parts.suggestions} />
        </Card>
      )}
      {parts.other.map((section, index) => (
        <Card key={index} title={section.heading}>
          {section.blocks.map((block, blockIndex) =>
            block.type === 'list' ? (
              <ul key={blockIndex} className="flex list-disc flex-col gap-1.5 pl-5 text-base leading-relaxed text-body marker:text-muted">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            ) : (
              <p key={blockIndex} className="text-base leading-relaxed text-body">
                <Inline text={block.text} />
              </p>
            ),
          )}
        </Card>
      ))}
    </div>
  )
}
