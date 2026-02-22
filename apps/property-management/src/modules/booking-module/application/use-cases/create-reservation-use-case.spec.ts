import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { UniqueId } from '@repo/core'
import { appContext } from '@/application-context'
import { InvalidReservationPeriodError, ListingNotFoundError } from '../@errors'
import { ListingRepository } from '@/modules/property-module/application/repositories/listing-repository'
import { ReservationRepository } from '../repositories/reservation-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { makeListing } from '@/modules/property-module/test/factories/make-listing'
import { CreateReservationUseCase } from './create-reservation-use-case'

describe('CreateReservationUseCase', () => {
	let listingRepo: ListingRepository
	let reservationRepo: ReservationRepository
	let sut: CreateReservationUseCase

	beforeEach(() => {
		listingRepo = mock(ListingRepository)
		reservationRepo = mock(ReservationRepository)
		sut = new CreateReservationUseCase({
			listingRepository: instance(listingRepo),
			reservationRepository: instance(reservationRepo),
		})
	})

	it('should return failure when period is less than 24 hours', () => {
		return appContext.run(makeAppContext(), async () => {
			const result = await sut.execute({
				listingId: 'some-listing-id',
				guestId: 'some-guest-id',
				period: {
					from: new Date('2026-04-01T10:00:00Z'),
					to: new Date('2026-04-02T09:00:00Z'),
				},
				totalPrice: { valueInCents: 10000, currency: 'BRL' },
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidReservationPeriodError)
		})
	})

	it('should return failure when listing is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(listingRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				listingId: 'non-existent-listing',
				guestId: 'some-guest-id',
				period: {
					from: new Date('2026-04-01'),
					to: new Date('2026-04-03'),
				},
				totalPrice: { valueInCents: 20000, currency: 'BRL' },
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(ListingNotFoundError)
		})
	})

	it('should create reservation successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)
			const listing = await makeListing(property.id)

			when(listingRepo.findById(anything())).thenResolve(listing)
			when(reservationRepo.save(anything())).thenResolve()

			const result = await sut.execute({
				listingId: listing.id,
				guestId: 'guest-123',
				period: {
					from: new Date('2026-04-01'),
					to: new Date('2026-04-05'),
				},
				totalPrice: { valueInCents: 60000, currency: 'BRL' },
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				const { reservation } = result.value
				expect(reservation.status).toBe('PENDING')
				expect(reservation.listingId).toBe(UniqueId(listing.id))
				expect(reservation.totalPrice).toEqual({
					valueInCents: 60000,
					currency: 'BRL',
				})
			}
			verify(reservationRepo.save(anything())).once()
		})
	})
})
