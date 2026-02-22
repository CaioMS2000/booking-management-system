import { describe, expect, it } from 'vitest'
import { ReservationMinDurationRule } from './reservation-min-duration-rule'

describe('ReservationMinDurationRule', () => {
	const rule = new ReservationMinDurationRule()

	it('should be valid when period is exactly 24 hours', () => {
		const from = new Date('2026-04-01T10:00:00Z')
		const to = new Date('2026-04-02T10:00:00Z')

		expect(rule.validate({ from, to })).toBe(true)
	})

	it('should be valid when period is longer than 24 hours', () => {
		const from = new Date('2026-04-01T10:00:00Z')
		const to = new Date('2026-04-03T10:00:00Z')

		expect(rule.validate({ from, to })).toBe(true)
	})

	it('should be invalid when period is less than 24 hours', () => {
		const from = new Date('2026-04-01T10:00:00Z')
		const to = new Date('2026-04-02T09:59:00Z')

		expect(rule.validate({ from, to })).toBe(false)
	})

	it('should be invalid when from and to are the same', () => {
		const from = new Date('2026-04-01T10:00:00Z')
		const to = new Date('2026-04-01T10:00:00Z')

		expect(rule.validate({ from, to })).toBe(false)
	})

	it('should be invalid when to is before from', () => {
		const from = new Date('2026-04-02T10:00:00Z')
		const to = new Date('2026-04-01T10:00:00Z')

		expect(rule.validate({ from, to })).toBe(false)
	})
})
