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
	ReservationNotPendingError,
} from '../@errors'
import { ReservationRepository } from '../repositories/reservation-repository'
import { ReservationConfirmedEvent } from '../@events/reservation-confirmed-event'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeReservation } from '@/modules/booking-module/test/factories/make-reservation'
import { ConfirmReservationUseCase } from './confirm-reservation-use-case'

describe('ConfirmReservationUseCase', () => {
	let reservationRepo: ReservationRepository
	let eventBusMock: EventBus
	let sut: ConfirmReservationUseCase

	beforeEach(() => {
		reservationRepo = mock(ReservationRepository)
		eventBusMock = mock(EventBus)
		sut = new ConfirmReservationUseCase({
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

	it('should return failure when reservation is not pending', () => {
		return appContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation(UniqueId('listing-123'), {
				status: 'CONFIRMED',
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)

			const result = await sut.execute({
				reservationId: reservation.id,
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(ReservationNotPendingError)
			verify(eventBusMock.emit(anything())).never()
		})
	})

	it('should confirm reservation successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation(UniqueId('listing-123'))
			when(reservationRepo.findById(anything())).thenResolve(reservation)
			when(reservationRepo.save(anything())).thenResolve()

			const result = await sut.execute({
				reservationId: reservation.id,
			})

			expect(result.isSuccess()).toBe(true)
			verify(reservationRepo.save(anything())).once()
		})
	})

	it('should emit ReservationConfirmedEvent after confirming', () => {
		return appContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation(UniqueId('listing-123'))
			when(reservationRepo.findById(anything())).thenResolve(reservation)
			when(reservationRepo.save(anything())).thenResolve()

			await sut.execute({
				reservationId: reservation.id,
			})

			verify(eventBusMock.emit(anything())).once()

			const [emittedEvent] = capture(eventBusMock.emit).last()
			expect(emittedEvent).toBeInstanceOf(ReservationConfirmedEvent)
			expect((emittedEvent as ReservationConfirmedEvent).payload).toEqual({
				reservationId: reservation.id,
				listingId: reservation.listingId,
				guestId: reservation.guestId,
			})
		})
	})
})
