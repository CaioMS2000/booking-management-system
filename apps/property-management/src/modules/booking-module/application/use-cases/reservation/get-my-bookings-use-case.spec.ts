import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { UniqueId } from '@repo/core'
import { requestContext } from '@/context/request-context'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeReservation } from '@/modules/booking-module/test/factories/make-reservation'
import { ReservationRepository } from '../../repositories/reservation-repository'
import { GetMyBookingsUseCase } from './get-my-bookings-use-case'

describe('GetMyBookingsUseCase', () => {
	let reservationRepo: ReservationRepository
	let sut: GetMyBookingsUseCase

	beforeEach(() => {
		reservationRepo = mock(ReservationRepository)
		sut = new GetMyBookingsUseCase({
			reservationRepository: instance(reservationRepo),
		})
	})

	it('should return reservations for the authenticated guest', () => {
		return requestContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
			})
			when(reservationRepo.findMany(anything(), anything())).thenResolve([
				reservation,
			])

			const result = await sut.execute({ guestId: 'guest-123' })

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.reservations).toHaveLength(1)
				expect(result.value.reservations[0]).toEqual(reservation)
			}
		})
	})

	it('should return empty list when guest has no bookings', () => {
		return requestContext.run(makeAppContext(), async () => {
			when(reservationRepo.findMany(anything(), anything())).thenResolve([])

			const result = await sut.execute({ guestId: 'guest-with-no-bookings' })

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.reservations).toHaveLength(0)
			}
		})
	})
})
