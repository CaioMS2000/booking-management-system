import { describe, expect, it } from 'vitest'
import { UniqueId } from '@repo/core'
import { Listing } from './listing'

function makeStubbedListing(intervals: Listing['intervals'] = []): Listing {
	return new Listing({
		id: UniqueId('listing-1'),
		propertyId: UniqueId('property-1'),
		publicId: 1,
		pricePerNight: { valueInCents: 10000, currency: 'BRL' },
		intervals,
		deletedAt: null,
	})
}

describe('Listing Availability', () => {
	const now = new Date('2026-01-15T00:00:00Z')

	describe('isAvailableFor', () => {
		it('should return true when there are no intervals', () => {
			const listing = makeStubbedListing()
			const period = {
				from: new Date('2026-03-01'),
				to: new Date('2026-03-05'),
			}

			expect(listing.isAvailableFor(period, now)).toBe(true)
		})

		it('should return false when period overlaps with a RESERVED interval', () => {
			const listing = makeStubbedListing([
				{
					from: new Date('2026-03-01'),
					to: new Date('2026-03-05'),
					status: 'RESERVED',
				},
			])
			const period = {
				from: new Date('2026-03-03'),
				to: new Date('2026-03-07'),
			}

			expect(listing.isAvailableFor(period, now)).toBe(false)
		})

		it('should return false when period overlaps with a HOLD interval', () => {
			const listing = makeStubbedListing([
				{
					from: new Date('2026-03-01'),
					to: new Date('2026-03-05'),
					status: 'HOLD',
					expiresAt: new Date('2026-03-01T00:15:00Z'),
				},
			])
			const period = {
				from: new Date('2026-03-03'),
				to: new Date('2026-03-07'),
			}

			expect(listing.isAvailableFor(period, now)).toBe(false)
		})

		it('should return true when overlapping HOLD is expired', () => {
			const listing = makeStubbedListing([
				{
					from: new Date('2026-03-01'),
					to: new Date('2026-03-05'),
					status: 'HOLD',
					expiresAt: new Date('2026-01-14T00:00:00Z'),
				},
			])
			const period = {
				from: new Date('2026-03-03'),
				to: new Date('2026-03-07'),
			}

			expect(listing.isAvailableFor(period, now)).toBe(true)
		})

		it('should return false when period overlaps with a BLOCKED interval', () => {
			const listing = makeStubbedListing([
				{
					from: new Date('2026-03-01'),
					to: new Date('2026-03-05'),
					status: 'BLOCKED',
				},
			])
			const period = {
				from: new Date('2026-03-03'),
				to: new Date('2026-03-07'),
			}

			expect(listing.isAvailableFor(period, now)).toBe(false)
		})

		it('should return true when period does not overlap any interval', () => {
			const listing = makeStubbedListing([
				{
					from: new Date('2026-03-01'),
					to: new Date('2026-03-05'),
					status: 'RESERVED',
				},
			])
			const period = {
				from: new Date('2026-03-05'),
				to: new Date('2026-03-09'),
			}

			expect(listing.isAvailableFor(period, now)).toBe(true)
		})

		it('should return true when only AVAILABLE intervals overlap', () => {
			const listing = makeStubbedListing([
				{
					from: new Date('2026-03-01'),
					to: new Date('2026-03-10'),
					status: 'AVAILABLE',
				},
			])
			const period = {
				from: new Date('2026-03-03'),
				to: new Date('2026-03-07'),
			}

			expect(listing.isAvailableFor(period, now)).toBe(true)
		})
	})

	describe('placeHold', () => {
		it('should place a hold on an available period', () => {
			const listing = makeStubbedListing()
			const period = {
				from: new Date('2026-03-01'),
				to: new Date('2026-03-05'),
			}
			const expiresAt = new Date('2026-03-01T00:15:00Z')

			const result = listing.placeHold(period, expiresAt, now)

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				const updated = result.value
				expect(updated.intervals).toHaveLength(1)
				expect(updated.intervals[0]).toEqual({
					from: period.from,
					to: period.to,
					status: 'HOLD',
					expiresAt,
				})
			}
		})

		it('should fail when period is not available', () => {
			const listing = makeStubbedListing([
				{
					from: new Date('2026-03-01'),
					to: new Date('2026-03-05'),
					status: 'RESERVED',
				},
			])
			const period = {
				from: new Date('2026-03-03'),
				to: new Date('2026-03-07'),
			}
			const expiresAt = new Date('2026-03-03T00:15:00Z')

			const result = listing.placeHold(period, expiresAt, now)

			expect(result.isFailure()).toBe(true)
		})
	})

	describe('confirmReservation', () => {
		it('should transition HOLD to RESERVED', () => {
			const period = {
				from: new Date('2026-03-01'),
				to: new Date('2026-03-05'),
			}
			const listing = makeStubbedListing([
				{
					from: period.from,
					to: period.to,
					status: 'HOLD',
					expiresAt: new Date('2026-03-01T00:15:00Z'),
				},
			])

			const result = listing.confirmReservation(period)

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				const updated = result.value
				expect(updated.intervals).toHaveLength(1)
				expect(updated.intervals[0].status).toBe('RESERVED')
				expect(updated.intervals[0].expiresAt).toBeUndefined()
			}
		})

		it('should fail when no matching HOLD exists', () => {
			const listing = makeStubbedListing()
			const period = {
				from: new Date('2026-03-01'),
				to: new Date('2026-03-05'),
			}

			const result = listing.confirmReservation(period)

			expect(result.isFailure()).toBe(true)
		})
	})

	describe('releaseInterval', () => {
		it('should remove a HOLD interval', () => {
			const period = {
				from: new Date('2026-03-01'),
				to: new Date('2026-03-05'),
			}
			const listing = makeStubbedListing([
				{
					from: period.from,
					to: period.to,
					status: 'HOLD',
					expiresAt: new Date('2026-03-01T00:15:00Z'),
				},
			])

			const result = listing.releaseInterval(period)

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.intervals).toHaveLength(0)
			}
		})

		it('should remove a RESERVED interval', () => {
			const period = {
				from: new Date('2026-03-01'),
				to: new Date('2026-03-05'),
			}
			const listing = makeStubbedListing([
				{
					from: period.from,
					to: period.to,
					status: 'RESERVED',
				},
			])

			const result = listing.releaseInterval(period)

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.intervals).toHaveLength(0)
			}
		})

		it('should fail when no matching interval exists', () => {
			const listing = makeStubbedListing()
			const period = {
				from: new Date('2026-03-01'),
				to: new Date('2026-03-05'),
			}

			const result = listing.releaseInterval(period)

			expect(result.isFailure()).toBe(true)
		})
	})

	describe('blockPeriod', () => {
		it('should block an available period', () => {
			const listing = makeStubbedListing()
			const period = {
				from: new Date('2026-03-01'),
				to: new Date('2026-03-05'),
			}

			const result = listing.blockPeriod(period, now)

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.intervals).toHaveLength(1)
				expect(result.value.intervals[0]).toEqual({
					from: period.from,
					to: period.to,
					status: 'BLOCKED',
				})
			}
		})

		it('should fail when period is not available', () => {
			const listing = makeStubbedListing([
				{
					from: new Date('2026-03-01'),
					to: new Date('2026-03-05'),
					status: 'RESERVED',
				},
			])
			const period = {
				from: new Date('2026-03-03'),
				to: new Date('2026-03-07'),
			}

			const result = listing.blockPeriod(period, now)

			expect(result.isFailure()).toBe(true)
		})
	})

	describe('cleanupExpiredHolds', () => {
		it('should remove expired HOLD intervals', () => {
			const listing = makeStubbedListing([
				{
					from: new Date('2026-03-01'),
					to: new Date('2026-03-05'),
					status: 'HOLD',
					expiresAt: new Date('2026-01-14T00:00:00Z'),
				},
				{
					from: new Date('2026-04-01'),
					to: new Date('2026-04-05'),
					status: 'RESERVED',
				},
			])

			const cleaned = listing.cleanupExpiredHolds(now)

			expect(cleaned.intervals).toHaveLength(1)
			expect(cleaned.intervals[0].status).toBe('RESERVED')
		})

		it('should keep non-expired HOLD intervals', () => {
			const listing = makeStubbedListing([
				{
					from: new Date('2026-03-01'),
					to: new Date('2026-03-05'),
					status: 'HOLD',
					expiresAt: new Date('2026-02-01T00:00:00Z'),
				},
			])

			const cleaned = listing.cleanupExpiredHolds(now)

			expect(cleaned.intervals).toHaveLength(1)
		})

		it('should not affect non-HOLD intervals', () => {
			const listing = makeStubbedListing([
				{
					from: new Date('2026-03-01'),
					to: new Date('2026-03-05'),
					status: 'AVAILABLE',
				},
				{
					from: new Date('2026-04-01'),
					to: new Date('2026-04-05'),
					status: 'BLOCKED',
				},
			])

			const cleaned = listing.cleanupExpiredHolds(now)

			expect(cleaned.intervals).toHaveLength(2)
		})
	})
})
