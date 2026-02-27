import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { UniqueId } from '@repo/core'
import { appContext } from '@/context/application-context'
import { ReservationRepository } from '../repositories/reservation-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeReservation } from '@/modules/booking-module/test/factories/make-reservation'
import { ListReservationsUseCase } from './list-reservations-use-case'

describe('ListReservationsUseCase', () => {
	let reservationRepo: ReservationRepository
	let sut: ListReservationsUseCase

	beforeEach(() => {
		reservationRepo = mock(ReservationRepository)
		sut = new ListReservationsUseCase({
			reservationRepository: instance(reservationRepo),
		})
	})

	it('should return reservations filtered by guest', () => {
		return appContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation(UniqueId('listing-123'))
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

	it('should return reservations filtered by listing', () => {
		return appContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation(UniqueId('listing-456'))
			when(reservationRepo.findMany(anything(), anything())).thenResolve([
				reservation,
			])

			const result = await sut.execute({ listingId: 'listing-456' })

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.reservations).toHaveLength(1)
			}
		})
	})

	it('should return empty list when no reservations match', () => {
		return appContext.run(makeAppContext(), async () => {
			when(reservationRepo.findMany(anything(), anything())).thenResolve([])

			const result = await sut.execute({ guestId: 'unknown-guest' })

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.reservations).toHaveLength(0)
			}
		})
	})

	it('should apply default pagination when not provided', () => {
		return appContext.run(makeAppContext(), async () => {
			when(reservationRepo.findMany(anything(), anything())).thenResolve([])

			const result = await sut.execute({})

			expect(result.isSuccess()).toBe(true)
		})
	})
})
