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
import { appContext } from '@/application-context'
import {
	ReservationNotFoundError,
	ReservationNotConfirmedError,
} from '../@errors'
import { ReservationRepository } from '../repositories/reservation-repository'
import { ReservationCompletedEvent } from '@repo/shared'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeReservation } from '@/modules/booking-module/test/factories/make-reservation'
import { CompleteReservationUseCase } from './complete-reservation-use-case'

describe('CompleteReservationUseCase', () => {
	let reservationRepo: ReservationRepository
	let eventBusMock: EventBus
	let sut: CompleteReservationUseCase

	beforeEach(() => {
		reservationRepo = mock(ReservationRepository)
		eventBusMock = mock(EventBus)
		sut = new CompleteReservationUseCase({
			reservationRepository: instance(reservationRepo),
			eventBus: instance(eventBusMock),
		})
	})

	it('should return failure when reservation is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(reservationRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				reservationId: 'non-existent-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(ReservationNotFoundError)
			verify(eventBusMock.emit(anything())).never()
		})
	})

	it('should return failure when reservation is not confirmed', () => {
		return appContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation(UniqueId('listing-123'), {
				status: 'PENDING',
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)

			const result = await sut.execute({
				reservationId: reservation.id,
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(ReservationNotConfirmedError)
			verify(eventBusMock.emit(anything())).never()
		})
	})

	it('should complete reservation successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation(UniqueId('listing-123'), {
				status: 'CONFIRMED',
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)
			when(reservationRepo.save(anything())).thenResolve()

			const result = await sut.execute({
				reservationId: reservation.id,
			})

			expect(result.isSuccess()).toBe(true)
			verify(reservationRepo.save(anything())).once()
		})
	})

	it('should emit ReservationCompletedEvent after completing', () => {
		return appContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation(UniqueId('listing-123'), {
				status: 'CONFIRMED',
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)
			when(reservationRepo.save(anything())).thenResolve()

			await sut.execute({
				reservationId: reservation.id,
			})

			verify(eventBusMock.emit(anything())).once()

			const [emittedEvent] = capture(eventBusMock.emit).last()
			expect(emittedEvent).toBeInstanceOf(ReservationCompletedEvent)
			expect((emittedEvent as ReservationCompletedEvent).payload).toEqual({
				reservationId: reservation.id,
				listingId: reservation.listingId,
				guestId: reservation.guestId,
			})
		})
	})
})
