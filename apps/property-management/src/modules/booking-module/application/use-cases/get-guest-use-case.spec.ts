import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { appContext } from '@/context/application-context'
import { GuestNotFoundError } from '../@errors'
import { GuestRepository } from '../repositories/guest-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeGuest } from '@/modules/booking-module/test/factories/make-guest'
import { GetGuestUseCase } from './get-guest-use-case'

describe('GetGuestUseCase', () => {
	let guestRepo: GuestRepository
	let sut: GetGuestUseCase

	beforeEach(() => {
		guestRepo = mock(GuestRepository)
		sut = new GetGuestUseCase({
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
		})
	})

	it('should return success with the guest', () => {
		return appContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()
			when(guestRepo.findById(anything())).thenResolve(guest)

			const result = await sut.execute({
				guestId: guest.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.guest).toEqual(guest)
			}
		})
	})
})
