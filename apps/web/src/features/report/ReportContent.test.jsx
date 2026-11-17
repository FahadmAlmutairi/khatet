import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ReportContent from './ReportContent.jsx'
import { parseReport, reportParts, splitItem } from './parseReport.js'

describe('parseReport', () => {
  it('splits the report into its headings, paragraphs and bullets', () => {
    const sections = parseReport('## Progress summary\nHalf is done.\nThe rest is close.\n\n## Warnings\n- One\n- Two\n')
    expect(sections).toEqual([
      { heading: 'Progress summary', blocks: [{ type: 'paragraph', text: 'Half is done. The rest is close.' }] },
      { heading: 'Warnings', blocks: [{ type: 'list', items: ['One', 'Two'] }] },
    ])
  })

  it('keeps text before the first heading', () => {
    expect(parseReport('Intro line')).toEqual([{ heading: null, blocks: [{ type: 'paragraph', text: 'Intro line' }] }])
  })
})

describe('reportParts', () => {
  it('splits each item into a title and a detail', () => {
    expect(splitItem('**Late task**: due last week.')).toEqual({ title: 'Late task', detail: 'due last week.' })
    expect(splitItem('Plain point with no detail')).toEqual({ title: 'Plain point with no detail', detail: '' })
  })

  it('treats "No warnings." as none', () => {
    const parts = reportParts('## Progress summary\nAll good.\n\n## Warnings\nNo warnings.\n\n## Suggestions\n- **Keep going**: well done.')
    expect(parts.summary).toEqual(['All good.'])
    expect(parts.warnings).toEqual([])
    expect(parts.suggestions).toEqual([{ title: 'Keep going', detail: 'well done.' }])
  })
})

describe('ReportContent', () => {
  it('shows markup in the report as text, never as HTML', () => {
    const { container } = render(<ReportContent content={'## Warnings\n- <img src=x onerror=alert(1)> **late**'} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('late').tagName).toBe('STRONG')
  })
})
