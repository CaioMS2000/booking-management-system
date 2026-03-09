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
import {
	PropertyModuleInterface,
	ReservationCancelledEvent,
} from '@repo/shared'
import { requestContext } from '@/context/request-context'
import {
	CancellationWindowExpiredError,
	ReservationAlreadyCancelledError,
	ReservationNotFoundError,
} from '../@errors'
import { ReservationRepository } from '../repositories/reservation-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeReservation } from '@/modules/booking-module/test/factories/make-reservation'
import { CancelReservationUseCase } from './cancel-reservation-use-case'

describe('CancelReservationUseCase', () => {
	let propertyModule: PropertyModuleInterface
	let reservationRepo: ReservationRepository
	let eventBusMock: EventBus
	let sut: CancelReservationUseCase

	beforeEach(() => {
		propertyModule = mock(PropertyModuleInterface)
		reservationRepo = mock(ReservationRepository)
		eventBusMock = mock(EventBus)
		sut = new CancelReservationUseCase({
			propertyModule: instance(propertyModule),
			reservationRepository: instance(reservationRepo),
			eventBus: instance(eventBusMock),
		})
	})

	it('should return failure when reservation is not found', () => {
		return requestContext.run(makeAppContext(), async () => {
			when(reservationRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				reservationId: 'non-existent-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(ReservationNotFoundError)
			verify(eventBusMock.emit(anything())).never()
		})
	})

	it('should return failure when reservation is already cancelled', () => {
		return requestContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
				overrides: { status: 'CANCELLED' },
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)

			const result = await sut.execute({
				reservationId: reservation.id,
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(ReservationAlreadyCancelledError)
			verify(eventBusMock.emit(anything())).never()
		})
	})

	it('should return failure when cancellation window has expired', () => {
		return requestContext.run(makeAppContext(), async () => {
			const checkIn = new Date('2026-04-01T10:00:00Z')
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
				overrides: {
					period: { from: checkIn, to: new Date('2026-04-05T10:00:00Z') },
				},
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)

			const result = await sut.execute({
				reservationId: reservation.id,
				now: new Date('2026-03-31T22:00:00Z'),
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(CancellationWindowExpiredError)
			verify(reservationRepo.save(anything())).never()
			verify(eventBusMock.emit(anything())).never()
		})
	})

	it('should cancel reservation successfully', () => {
		return requestContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)
			when(reservationRepo.save(anything())).thenResolve()
			when(propertyModule.releaseInterval(anything(), anything())).thenResolve({
				success: true,
				listing: {} as any,
			})

			const result = await sut.execute({
				reservationId: reservation.id,
				now: new Date('2026-01-01'),
			})

			expect(result.isSuccess()).toBe(true)
			verify(reservationRepo.save(anything())).once()
		})
	})

	it('should call releaseInterval on property module', () => {
		return requestContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)
			when(reservationRepo.save(anything())).thenResolve()
			when(propertyModule.releaseInterval(anything(), anything())).thenResolve({
				success: true,
				listing: {} as any,
			})

			await sut.execute({
				reservationId: reservation.id,
				now: new Date('2026-01-01'),
			})

			verify(propertyModule.releaseInterval(anything(), anything())).once()

			const [listingId, period] = capture(propertyModule.releaseInterval).last()
			expect(listingId).toBe(reservation.listingId)
			expect(period).toEqual(reservation.period)
		})
	})

	it('should emit ReservationCancelledEvent after cancelling', () => {
		return requestContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)
			when(reservationRepo.save(anything())).thenResolve()
			when(propertyModule.releaseInterval(anything(), anything())).thenResolve({
				success: true,
				listing: {} as any,
			})

			await sut.execute({
				reservationId: reservation.id,
				now: new Date('2026-01-01'),
			})

			verify(eventBusMock.emit(anything())).once()

			const [emittedEvent] = capture(eventBusMock.emit).last()
			expect(emittedEvent).toBeInstanceOf(ReservationCancelledEvent)
			expect((emittedEvent as ReservationCancelledEvent).payload).toEqual({
				reservationId: reservation.id,
				listingId: reservation.listingId,
				guestId: reservation.guestId,
			})
		})
	})
})
