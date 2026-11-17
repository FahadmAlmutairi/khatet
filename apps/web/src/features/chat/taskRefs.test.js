import { describe, expect, it } from 'vitest'
import { encodeReferences, mentionAt, splitMessage } from './taskRefs.js'

describe('task references in chat (US-25)', () => {
  it('splits a message into text and task parts', () => {
    expect(splitMessage('See #[task:t-6] and #[task:t-7].')).toEqual([
      { type: 'text', text: 'See ' },
      { type: 'task', taskId: 't-6' },
      { type: 'text', text: ' and ' },
      { type: 'task', taskId: 't-7' },
      { type: 'text', text: '.' },
    ])
    expect(splitMessage('No links')).toEqual([{ type: 'text', text: 'No links' }])
  })

  it('puts the token in for each picked title, longest first', () => {
    const refs = [
      { label: 'Fix CSV', taskId: 't-1' },
      { label: 'Fix CSV validation errors', taskId: 't-6' },
    ]
    expect(encodeReferences('Done: #Fix CSV validation errors, next #Fix CSV', refs)).toBe('Done: #[task:t-6], next #[task:t-1]')
    expect(encodeReferences('#Fix CV is edited', refs)).toBe('#Fix CV is edited')
  })

  it('finds the # being typed before the caret', () => {
    expect(mentionAt('look at #fix', 12)).toEqual({ start: 8, query: 'fix' })
    expect(mentionAt('#', 1)).toEqual({ start: 0, query: '' })
    expect(mentionAt('issue#3', 7)).toBeNull()
    expect(mentionAt('#one\ntwo', 8)).toBeNull()
  })
})
