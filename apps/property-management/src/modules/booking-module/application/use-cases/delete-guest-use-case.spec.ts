import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { appContext } from '@/context/application-context'
import { GuestNotFoundError } from '../@errors'
import { GuestRepository } from '../repositories/guest-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeGuest } from '@/modules/booking-module/test/factories/make-guest'
import { DeleteGuestUseCase } from './delete-guest-use-case'

describe('DeleteGuestUseCase', () => {
	let guestRepo: GuestRepository
	let sut: DeleteGuestUseCase

	beforeEach(() => {
		guestRepo = mock(GuestRepository)
		sut = new DeleteGuestUseCase({
			guestRepository: instance(guestRepo),
		})
	})

	it('should return failure when guest is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(guestRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				guestId: 'non-existent-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(GuestNotFoundError)
			verify(guestRepo.delete(anything())).never()
		})
	})

	it('should delete guest successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()
			when(guestRepo.findById(anything())).thenResolve(guest)
			when(guestRepo.delete(anything())).thenResolve()

			const result = await sut.execute({
				guestId: guest.id,
			})

			expect(result.isSuccess()).toBe(true)
			expect(result.value).toBeNull()
			verify(guestRepo.delete(anything())).once()
		})
	})
})
