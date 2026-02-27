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
import { PropertyModuleInterface, ReservationCreatedEvent } from '@repo/shared'
import { appContext } from '@/context/application-context'
import {
	InvalidReservationPeriodError,
	ListingNotFoundError,
	OutsideSlidingWindowError,
	PeriodUnavailableError,
} from '../@errors'
import { ReservationRepository } from '../repositories/reservation-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
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
			when(propertyModule.placeHold(anything(), anything())).thenResolve({
				success: false,
				reason: 'LISTING_NOT_FOUND',
			})

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

	it('should return failure when period is unavailable', () => {
		return appContext.run(makeAppContext(), async () => {
			when(propertyModule.placeHold(anything(), anything())).thenResolve({
				success: false,
				reason: 'PERIOD_UNAVAILABLE',
			})

			const result = await sut.execute({
				listingId: 'listing-123',
				guestId: 'guest-123',
				period: {
					from: new Date('2026-04-01'),
					to: new Date('2026-04-05'),
				},
				totalPrice: { valueInCents: 60000, currency: 'BRL' },
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(PeriodUnavailableError)
			verify(reservationRepo.save(anything())).never()
			verify(eventBusMock.emit(anything())).never()
		})
	})

	it('should return failure when period is outside sliding window', () => {
		return appContext.run(makeAppContext(), async () => {
			when(propertyModule.placeHold(anything(), anything())).thenResolve({
				success: false,
				reason: 'OUTSIDE_SLIDING_WINDOW',
			})

			const result = await sut.execute({
				listingId: 'listing-123',
				guestId: 'guest-123',
				period: {
					from: new Date('2028-04-01'),
					to: new Date('2028-04-05'),
				},
				totalPrice: { valueInCents: 60000, currency: 'BRL' },
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(OutsideSlidingWindowError)
			verify(reservationRepo.save(anything())).never()
			verify(eventBusMock.emit(anything())).never()
		})
	})

	it('should create reservation successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			when(propertyModule.placeHold(anything(), anything())).thenResolve({
				success: true,
				listing: {
					id: 'listing-123',
					publicId: 1,
					pricePerNight: { valueInCents: 10000, currency: 'BRL' },
					intervals: [],
					deletedAt: null,
				},
			})
			when(reservationRepo.save(anything())).thenResolve()

			const result = await sut.execute({
				listingId: 'listing-123',
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
				expect(reservation.listingId).toBe(UniqueId('listing-123'))
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
			when(propertyModule.placeHold(anything(), anything())).thenResolve({
				success: true,
				listing: {
					id: 'listing-123',
					publicId: 1,
					pricePerNight: { valueInCents: 10000, currency: 'BRL' },
					intervals: [],
					deletedAt: null,
				},
			})
			when(reservationRepo.save(anything())).thenResolve()

			await sut.execute({
				listingId: 'listing-123',
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
				listingId: UniqueId('listing-123'),
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
