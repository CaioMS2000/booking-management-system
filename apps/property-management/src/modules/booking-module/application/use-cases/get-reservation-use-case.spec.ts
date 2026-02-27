import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { UniqueId } from '@repo/core'
import { appContext } from '@/context/application-context'
import { ReservationNotFoundError } from '../@errors'
import { ReservationRepository } from '../repositories/reservation-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeReservation } from '@/modules/booking-module/test/factories/make-reservation'
import { GetReservationUseCase } from './get-reservation-use-case'

describe('GetReservationUseCase', () => {
	let reservationRepo: ReservationRepository
	let sut: GetReservationUseCase

	beforeEach(() => {
		reservationRepo = mock(ReservationRepository)
		sut = new GetReservationUseCase({
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

	it('should return success with the reservation', () => {
		return appContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation(UniqueId('listing-123'))
			when(reservationRepo.findById(anything())).thenResolve(reservation)

			const result = await sut.execute({
				reservationId: reservation.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.reservation).toEqual(reservation)
			}
		})
	})
})
