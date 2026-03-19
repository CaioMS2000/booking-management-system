import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { UniqueId } from '@repo/core'
import { PropertyModuleInterface } from '@repo/shared'
import { requestContext } from '@/context/request-context'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeReservation } from '@/modules/booking-module/test/factories/make-reservation'
import { ReservationNotFoundError, UnauthorizedError } from '../../@errors'
import { ReservationRepository } from '../../repositories/reservation-repository'
import { GetPropertyReservationUseCase } from './get-property-reservation-use-case'

describe('GetPropertyReservationUseCase', () => {
	let reservationRepo: ReservationRepository
	let propertyModule: PropertyModuleInterface
	let sut: GetPropertyReservationUseCase

	beforeEach(() => {
		reservationRepo = mock(ReservationRepository)
		propertyModule = mock(PropertyModuleInterface)
		sut = new GetPropertyReservationUseCase({
			reservationRepository: instance(reservationRepo),
			propertyModule: instance(propertyModule),
		})
	})

	it('should return failure when reservation is not found', () => {
		return requestContext.run(makeAppContext(), async () => {
			when(reservationRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				hostId: 'host-123',
				reservationId: 'non-existent-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(ReservationNotFoundError)
		})
	})

	it('should return failure when reservation belongs to another host', () => {
		return requestContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)
			when(
				propertyModule.isListingOwnedByHost(anything(), anything())
			).thenResolve(false)

			const result = await sut.execute({
				hostId: 'other-host-id',
				reservationId: reservation.id,
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(UnauthorizedError)
		})
	})

	it('should return success when host accesses a reservation on their property', () => {
		return requestContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)
			when(
				propertyModule.isListingOwnedByHost(anything(), anything())
			).thenResolve(true)

			const result = await sut.execute({
				hostId: 'host-123',
				reservationId: reservation.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.reservation).toEqual(reservation)
			}
		})
	})
})
