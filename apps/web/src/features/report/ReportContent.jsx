// Shows the report text from the AI service. The prompt asks for three "## " headings with
// sentences and "- " bullets under them (apps/api/src/ai/reportPrompt.js). The text is turned
// into React elements line by line, never into raw HTML, so nothing in it can run as code.
import { parseReport } from './parseReport.js'

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

export default function ReportContent({ content }) {
  const sections = parseReport(content)
  return (
    <div className="flex flex-col gap-6">
      {sections.map((section, index) => (
        <section key={index} className="flex flex-col gap-2">
          {section.heading && <h2 className="text-lg font-semibold text-heading">{section.heading}</h2>}
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
        </section>
      ))}
    </div>
  )
}
