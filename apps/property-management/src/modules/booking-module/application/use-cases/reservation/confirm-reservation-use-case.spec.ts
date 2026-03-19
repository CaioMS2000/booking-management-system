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
	ReservationConfirmedEvent,
} from '@repo/shared'
import { requestContext } from '@/context/request-context'
import {
	ReservationNotFoundError,
	ReservationNotPendingError,
} from '../../@errors'
import { ReservationRepository } from '../../repositories/reservation-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeReservation } from '@/modules/booking-module/test/factories/make-reservation'
import { ConfirmReservationUseCase } from './confirm-reservation-use-case'

describe('ConfirmReservationUseCase', () => {
	let propertyModule: PropertyModuleInterface
	let reservationRepo: ReservationRepository
	let eventBusMock: EventBus
	let sut: ConfirmReservationUseCase

	beforeEach(() => {
		propertyModule = mock(PropertyModuleInterface)
		reservationRepo = mock(ReservationRepository)
		eventBusMock = mock(EventBus)
		sut = new ConfirmReservationUseCase({
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

	it('should return failure when reservation is not pending', () => {
		return requestContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
				overrides: { status: 'CONFIRMED' },
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
		return requestContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)
			when(reservationRepo.save(anything())).thenResolve()
			when(
				propertyModule.confirmReservationOnListing(anything(), anything())
			).thenResolve({ success: true, listing: {} as any })

			const result = await sut.execute({
				reservationId: reservation.id,
			})

			expect(result.isSuccess()).toBe(true)
			verify(reservationRepo.save(anything())).once()
		})
	})

	it('should call confirmReservationOnListing on property module', () => {
		return requestContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)
			when(reservationRepo.save(anything())).thenResolve()
			when(
				propertyModule.confirmReservationOnListing(anything(), anything())
			).thenResolve({ success: true, listing: {} as any })

			await sut.execute({
				reservationId: reservation.id,
			})

			verify(
				propertyModule.confirmReservationOnListing(anything(), anything())
			).once()

			const [listingId, period] = capture(
				propertyModule.confirmReservationOnListing
			).last()
			expect(listingId).toBe(reservation.listingId)
			expect(period).toEqual(reservation.period)
		})
	})

	it('should emit ReservationConfirmedEvent after confirming', () => {
		return requestContext.run(makeAppContext(), async () => {
			const reservation = await makeReservation({
				listingId: UniqueId('listing-123'),
			})
			when(reservationRepo.findById(anything())).thenResolve(reservation)
			when(reservationRepo.save(anything())).thenResolve()
			when(
				propertyModule.confirmReservationOnListing(anything(), anything())
			).thenResolve({ success: true, listing: {} as any })

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
