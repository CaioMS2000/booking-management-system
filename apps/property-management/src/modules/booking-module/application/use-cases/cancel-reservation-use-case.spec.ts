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
import {
	ReservationNotFoundError,
	ReservationAlreadyCancelledError,
} from '../@errors'
import { ReservationRepository } from '../repositories/reservation-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeReservation } from '@/modules/booking-module/test/factories/make-reservation'
import { CancelReservationUseCase } from './cancel-reservation-use-case'

describe('CancelReservationUseCase', () => {
	let reservationRepo: ReservationRepository
	let sut: CancelReservationUseCase

	beforeEach(() => {
		reservationRepo = mock(ReservationRepository)
		sut = new CancelReservationUseCase({
			reservationRepository: instance(reservationRepo),
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
		})
	})

	it('should return failure when reservation is already cancelled', () => {
		return appContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation(UniqueId('listing-123'), {
				status: 'CANCELLED',
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)

			const result = await sut.execute({
				reservationId: reservation.id,
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(ReservationAlreadyCancelledError)
		})
	})

	it('should cancel reservation successfully', () => {
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
})
