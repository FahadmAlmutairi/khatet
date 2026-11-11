import { describe, expect, it } from 'vitest'
import { fullPosition } from './boardPosition.js'

describe('fullPosition', () => {
  const lane = ['a', 'b', 'c', 'd', 'e']

  it('matches the visible place when no filter hides cards', () => {
    expect(fullPosition(['b', 'a', 'c', 'd', 'e'], 'b', lane)).toBe(1)
    expect(fullPosition(['a', 'c', 'd', 'b', 'e'], 'b', lane)).toBe(4)
  })

  it('places the card after its visible neighbour in the full lane when a filter hides cards', () => {
    // Visible: a, c, e. Dropping a after e puts it at the end of the full lane.
    expect(fullPosition(['c', 'e', 'a'], 'a', lane)).toBe(5)
    // Dropping e between a and c puts it right after a, not third in the full lane.
    expect(fullPosition(['a', 'e', 'c'], 'e', lane)).toBe(2)
    // First among the visible cards: right before the next visible card.
    expect(fullPosition(['e', 'a', 'c'], 'e', lane)).toBe(1)
  })

  it('adds the card at the end of a lane it is new to', () => {
    expect(fullPosition(['x'], 'x', lane)).toBe(6)
  })
})
