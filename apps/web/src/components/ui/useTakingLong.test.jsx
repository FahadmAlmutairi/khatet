import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SLOW_AFTER_MS, useTakingLong } from './useTakingLong.js'

describe('useTakingLong', () => {
  afterEach(() => vi.useRealTimers())

  it('turns true only after the wait passes the delay, and resets when the wait ends', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ active }) => useTakingLong(active), { initialProps: { active: true } })
    expect(result.current).toBe(false)

    act(() => vi.advanceTimersByTime(SLOW_AFTER_MS))
    expect(result.current).toBe(true)

    rerender({ active: false })
    expect(result.current).toBe(false)

    // A new wait starts from zero again.
    rerender({ active: true })
    expect(result.current).toBe(false)
  })
})
