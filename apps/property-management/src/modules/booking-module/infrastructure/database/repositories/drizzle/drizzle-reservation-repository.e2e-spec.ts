import { Email, Phone, UniqueId } from '@repo/core'
import { afterAll, afterEach, describe, expect, it } from 'vitest'

import { requestContext } from '@/context/request-context'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { makeListing } from '@/modules/property-module/test/factories/make-listing'
import { DrizzleHostRepository } from '@/modules/property-module/infrastructure/database/repositories/drizzle/drizzle-host-repository'
import { DrizzlePropertyRepository } from '@/modules/property-module/infrastructure/database/repositories/drizzle/drizzle-property-repository'
import { DrizzleListingRepository } from '@/modules/property-module/infrastructure/database/repositories/drizzle/drizzle-listing-repository'
import { FakeIdGenerator } from '@/modules/property-module/test/fake-id-generator'
import { makeGuest } from '@/modules/booking-module/test/factories/make-guest'
import { makeReservation } from '@/modules/booking-module/test/factories/make-reservation'
import {
	cleanDatabase,
	closeDatabase,
} from '@/modules/booking-module/test/setup-database'
import { DrizzleGuestRepository } from './drizzle-guest-repository'
import { DrizzleReservationRepository } from './drizzle-reservation-repository'

const ctx = makeAppContext()
const hostRepository = new DrizzleHostRepository()
const propertyRepository = new DrizzlePropertyRepository()
const listingRepository = new DrizzleListingRepository(new FakeIdGenerator())
const guestRepository = new DrizzleGuestRepository()
const repository = new DrizzleReservationRepository()

async function createPrerequisites() {
	const host = await makeHost()
	await hostRepository.save(host)

	const property = await makeProperty({ hostId: host.id })
	await propertyRepository.save(property)

	const listing = await makeListing({ propertyId: property.id })
	await listingRepository.save(listing)

	const guest = await makeGuest()
	await guestRepository.save(guest)

	return { host, property, listing, guest }
}

describe('DrizzleReservationRepository', () => {
	afterEach(async () => {
		await cleanDatabase()
	})

	afterAll(async () => {
		await closeDatabase()
	})

	it('should save and find a reservation by id', async () => {
		await requestContext.run(ctx, async () => {
			const { listing, guest } = await createPrerequisites()

			const reservation = await makeReservation({
				listingId: listing.id,
				overrides: { guestId: guest.id },
			})
			await repository.save(reservation)

			const found = await repository.findById(reservation.id)

			expect(found).not.toBeNull()
			expect(found!.id).toBe(reservation.id)
			expect(found!.listingId).toBe(reservation.listingId)
			expect(found!.guestId).toBe(reservation.guestId)
			expect(found!.period.from).toEqual(reservation.period.from)
			expect(found!.period.to).toEqual(reservation.period.to)
			expect(found!.status).toBe(reservation.status)
			expect(found!.totalPrice.valueInCents).toBe(
				reservation.totalPrice.valueInCents
			)
			expect(found!.totalPrice.currency).toBe(reservation.totalPrice.currency)
		})
	})

	it('should return null when reservation is not found', async () => {
		await requestContext.run(ctx, async () => {
			const found = await repository.findById(UniqueId('non-existent-id'))
			expect(found).toBeNull()
		})
	})

	it('should find many reservations without filters', async () => {
		await requestContext.run(ctx, async () => {
			const { listing, guest } = await createPrerequisites()

			const reservation1 = await makeReservation({
				listingId: listing.id,
				overrides: { guestId: guest.id },
			})
			const reservation2 = await makeReservation({
				listingId: listing.id,
				overrides: {
					guestId: guest.id,
					period: {
						from: new Date('2026-05-01'),
						to: new Date('2026-05-05'),
					},
				},
			})

			await repository.save(reservation1)
			await repository.save(reservation2)

			const found = await repository.findMany()
			expect(found).toHaveLength(2)
		})
	})

	it('should find many reservations with guestId filter', async () => {
		await requestContext.run(ctx, async () => {
			const { listing, guest } = await createPrerequisites()

			const guest2 = await makeGuest({
				overrides: {
					email: Email.create('other@example.com').value as Email,
					phone: Phone.create('+5511888888888').value as Phone,
				},
			})
			await guestRepository.save(guest2)

			const reservation1 = await makeReservation({
				listingId: listing.id,
				overrides: { guestId: guest.id },
			})
			const reservation2 = await makeReservation({
				listingId: listing.id,
				overrides: {
					guestId: guest2.id,
					period: {
						from: new Date('2026-05-01'),
						to: new Date('2026-05-05'),
					},
				},
			})

			await repository.save(reservation1)
			await repository.save(reservation2)

			const found = await repository.findMany({
				guestId: guest.id,
			})
			expect(found).toHaveLength(1)
			expect(found[0].guestId).toBe(guest.id)
		})
	})

	it('should find many reservations with listingId filter', async () => {
		await requestContext.run(ctx, async () => {
			const { listing, guest, property } = await createPrerequisites()

			const listing2 = await makeListing({ propertyId: property.id })
			await listingRepository.save(listing2)

			const reservation1 = await makeReservation({
				listingId: listing.id,
				overrides: { guestId: guest.id },
			})
			const reservation2 = await makeReservation({
				listingId: listing2.id,
				overrides: {
					guestId: guest.id,
					period: {
						from: new Date('2026-05-01'),
						to: new Date('2026-05-05'),
					},
				},
			})

			await repository.save(reservation1)
			await repository.save(reservation2)

			const found = await repository.findMany({
				listingId: listing.id,
			})
			expect(found).toHaveLength(1)
			expect(found[0].listingId).toBe(listing.id)
		})
	})

	it('should find many reservations with pagination', async () => {
		await requestContext.run(ctx, async () => {
			const { listing, guest } = await createPrerequisites()

			const reservations = await Promise.all(
				Array.from({ length: 3 }, (_, i) =>
					makeReservation({
						listingId: listing.id,
						overrides: {
							guestId: guest.id,
							period: {
								from: new Date(`2026-0${i + 4}-01`),
								to: new Date(`2026-0${i + 4}-05`),
							},
						},
					})
				)
			)

			for (const reservation of reservations) {
				await repository.save(reservation)
			}

			const found = await repository.findMany(undefined, {
				page: 1,
				limit: 2,
			})
			expect(found).toHaveLength(2)
		})
	})
})
