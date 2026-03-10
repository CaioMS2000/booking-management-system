import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { beforeEach, describe, expect, it } from 'vitest'
import { requestContext } from '@/context/request-context'
import { makeAppContext } from '@/test/factories/make-app-context'
import { makeGuest } from '@/test/factories/make-guest'
import { GuestNotFoundError } from '../@errors'
import { GuestRepository } from '../repositories/guest-repository'
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
		return requestContext.run(makeAppContext(), async () => {
			when(guestRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				guestId: 'non-existent-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(GuestNotFoundError)
		})
	})

	it('should soft delete guest successfully', () => {
		return requestContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()
			when(guestRepo.findById(anything())).thenResolve(guest)
			when(guestRepo.delete(anything())).thenResolve()

			const result = await sut.execute({
				guestId: guest.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.isDeleted).toBe(true)
				expect(result.value.deletedAt).toBeInstanceOf(Date)
			}
			verify(guestRepo.delete(anything())).once()
		})
	})
})
