import { describe, expect, it } from 'vitest'
import { IntervalWithinSlidingWindowRule } from './interval-within-sliding-window-rule'

describe('IntervalWithinSlidingWindowRule', () => {
	const rule = new IntervalWithinSlidingWindowRule()

	it('should return true when from is within 12 months', () => {
		const now = new Date('2026-01-01')
		const from = new Date('2026-06-01')
		expect(rule.validate({ from, now })).toBe(true)
	})

	it('should return true when from is exactly 12 months away', () => {
		const now = new Date('2026-01-01T00:00:00Z')
		const from = new Date('2027-01-01T00:00:00Z')
		expect(rule.validate({ from, now })).toBe(true)
	})

	it('should return false when from is beyond 12 months', () => {
		const now = new Date('2026-01-01T00:00:00Z')
		const from = new Date('2027-01-02T00:00:00Z')
		expect(rule.validate({ from, now })).toBe(false)
	})

	it('should return true when from is in the past', () => {
		const now = new Date('2026-06-01')
		const from = new Date('2026-01-01')
		expect(rule.validate({ from, now })).toBe(true)
	})
})
