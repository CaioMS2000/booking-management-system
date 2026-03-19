import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { UniqueId } from '@repo/core'
import { PropertyModuleInterface } from '@repo/shared'
import { requestContext } from '@/context/request-context'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeReservation } from '@/modules/booking-module/test/factories/make-reservation'
import { ReservationRepository } from '../../repositories/reservation-repository'
import { GetPropertyReservationsUseCase } from './get-property-reservations-use-case'

describe('GetPropertyReservationsUseCase', () => {
	let reservationRepo: ReservationRepository
	let propertyModule: PropertyModuleInterface
	let sut: GetPropertyReservationsUseCase

	beforeEach(() => {
		reservationRepo = mock(ReservationRepository)
		propertyModule = mock(PropertyModuleInterface)
		sut = new GetPropertyReservationsUseCase({
			reservationRepository: instance(reservationRepo),
			propertyModule: instance(propertyModule),
		})
	})

	it('should return reservations for the host', () => {
		return requestContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
			})
			when(reservationRepo.findMany(anything(), anything())).thenResolve([
				reservation,
			])

			const result = await sut.execute({ hostId: 'host-123' })

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.reservations).toHaveLength(1)
				expect(result.value.reservations[0]).toEqual(reservation)
			}
		})
	})

	it('should filter by listing when listingId is provided', () => {
		return requestContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
			})
			when(reservationRepo.findMany(anything(), anything())).thenResolve([
				reservation,
			])

			const result = await sut.execute({
				hostId: 'host-123',
				listingId: 'listing-123',
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.reservations).toHaveLength(1)
			}
		})
	})

	it('should return empty list when host has no reservations', () => {
		return requestContext.run(makeAppContext(), async () => {
			when(reservationRepo.findMany(anything(), anything())).thenResolve([])

			const result = await sut.execute({ hostId: 'host-with-no-reservations' })

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.reservations).toHaveLength(0)
			}
		})
	})
})
