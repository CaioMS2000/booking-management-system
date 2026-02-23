import { describe, expect, it } from 'vitest'
import { CancellationWindowRule } from './cancellation-window-rule'

describe('CancellationWindowRule', () => {
	const rule = new CancellationWindowRule()

	it('should be valid when check-in is exactly 24 hours away', () => {
		const now = new Date('2026-04-01T10:00:00Z')
		const checkInDate = new Date('2026-04-02T10:00:00Z')

		expect(rule.validate({ checkInDate, now })).toBe(true)
	})

	it('should be valid when check-in is more than 24 hours away', () => {
		const now = new Date('2026-04-01T10:00:00Z')
		const checkInDate = new Date('2026-04-03T10:00:00Z')

		expect(rule.validate({ checkInDate, now })).toBe(true)
	})

	it('should be invalid when check-in is less than 24 hours away', () => {
		const now = new Date('2026-04-01T10:00:00Z')
		const checkInDate = new Date('2026-04-02T09:59:00Z')

		expect(rule.validate({ checkInDate, now })).toBe(false)
	})

	it('should be invalid when check-in is in the past', () => {
		const now = new Date('2026-04-05T10:00:00Z')
		const checkInDate = new Date('2026-04-01T10:00:00Z')

		expect(rule.validate({ checkInDate, now })).toBe(false)
	})

	it('should be invalid when check-in is exactly now', () => {
		const now = new Date('2026-04-01T10:00:00Z')
		const checkInDate = new Date('2026-04-01T10:00:00Z')

		expect(rule.validate({ checkInDate, now })).toBe(false)
	})
})
