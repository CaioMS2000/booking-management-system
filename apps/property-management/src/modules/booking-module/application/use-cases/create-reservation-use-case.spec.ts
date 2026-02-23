import {
	anything,
	capture,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { EventBus, UniqueId } from '@repo/core'
import { PropertyModuleInterface } from '@repo/modules-contracts'
import { appContext } from '@/application-context'
import {
	DoubleBookingError,
	InvalidReservationPeriodError,
	ListingNotFoundError,
} from '../@errors'
import { ReservationRepository } from '../repositories/reservation-repository'
import { ReservationCreatedEvent } from '../@events/reservation-created-event'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { makeListing } from '@/modules/property-module/test/factories/make-listing'
import { CreateReservationUseCase } from './create-reservation-use-case'

describe('CreateReservationUseCase', () => {
	let propertyModule: PropertyModuleInterface
	let reservationRepo: ReservationRepository
	let eventBusMock: EventBus
	let sut: CreateReservationUseCase

	beforeEach(() => {
		propertyModule = mock(PropertyModuleInterface)
		reservationRepo = mock(ReservationRepository)
		eventBusMock = mock(EventBus)
		sut = new CreateReservationUseCase({
			propertyModule: instance(propertyModule),
			reservationRepository: instance(reservationRepo),
			eventBus: instance(eventBusMock),
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
			verify(eventBusMock.emit(anything())).never()
		})
	})

	it('should return failure when listing is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(propertyModule.findListing(anything())).thenResolve(null)

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
			verify(eventBusMock.emit(anything())).never()
		})
	})

	it('should return failure when a conflicting reservation exists', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)
			const listing = await makeListing(property.id)

			when(propertyModule.findListing(anything())).thenResolve(listing)
			when(reservationRepo.hasOverlapping(anything(), anything())).thenResolve(
				true
			)

			const result = await sut.execute({
				listingId: listing.id,
				guestId: 'guest-123',
				period: {
					from: new Date('2026-04-01'),
					to: new Date('2026-04-05'),
				},
				totalPrice: { valueInCents: 60000, currency: 'BRL' },
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(DoubleBookingError)
			verify(reservationRepo.save(anything())).never()
			verify(eventBusMock.emit(anything())).never()
		})
	})

	it('should create reservation successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)
			const listing = await makeListing(property.id)

			when(propertyModule.findListing(anything())).thenResolve(listing)
			when(reservationRepo.hasOverlapping(anything(), anything())).thenResolve(
				false
			)
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

	it('should emit ReservationCreatedEvent after creating reservation', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)
			const listing = await makeListing(property.id)

			when(propertyModule.findListing(anything())).thenResolve(listing)
			when(reservationRepo.hasOverlapping(anything(), anything())).thenResolve(
				false
			)
			when(reservationRepo.save(anything())).thenResolve()

			await sut.execute({
				listingId: listing.id,
				guestId: 'guest-123',
				period: {
					from: new Date('2026-04-01'),
					to: new Date('2026-04-05'),
				},
				totalPrice: { valueInCents: 60000, currency: 'BRL' },
			})

			verify(eventBusMock.emit(anything())).once()

			const [emittedEvent] = capture(eventBusMock.emit).last()
			expect(emittedEvent).toBeInstanceOf(ReservationCreatedEvent)
			expect((emittedEvent as ReservationCreatedEvent).payload).toEqual({
				listingId: UniqueId(listing.id),
				guestId: UniqueId('guest-123'),
				period: {
					from: new Date('2026-04-01'),
					to: new Date('2026-04-05'),
				},
				status: 'PENDING',
				totalPrice: { valueInCents: 60000, currency: 'BRL' },
			})
		})
	})
})
