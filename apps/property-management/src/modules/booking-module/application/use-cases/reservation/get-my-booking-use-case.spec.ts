import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { UniqueId } from '@repo/core'
import { requestContext } from '@/context/request-context'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeReservation } from '@/modules/booking-module/test/factories/make-reservation'
import { ReservationNotFoundError, UnauthorizedError } from '../../@errors'
import { ReservationRepository } from '../../repositories/reservation-repository'
import { GetMyBookingUseCase } from './get-my-booking-use-case'

describe('GetMyBookingUseCase', () => {
	let reservationRepo: ReservationRepository
	let sut: GetMyBookingUseCase

	beforeEach(() => {
		reservationRepo = mock(ReservationRepository)
		sut = new GetMyBookingUseCase({
			reservationRepository: instance(reservationRepo),
		})
	})

	it('should return failure when reservation is not found', () => {
		return requestContext.run(makeAppContext(), async () => {
			when(reservationRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				guestId: 'guest-123',
				reservationId: 'non-existent-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(ReservationNotFoundError)
		})
	})

	it('should return failure when reservation belongs to another guest', () => {
		return requestContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
				overrides: { guestId: UniqueId('other-guest-id') },
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)

			const result = await sut.execute({
				guestId: 'guest-123',
				reservationId: reservation.id,
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(UnauthorizedError)
		})
	})

	it('should return success when guest accesses their own reservation', () => {
		return requestContext.run(makeAppContext(), async () => {
			const guestId = UniqueId('guest-123')
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
				overrides: { guestId },
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)

			const result = await sut.execute({
				guestId: String(guestId),
				reservationId: reservation.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.reservation).toEqual(reservation)
			}
		})
	})
})
