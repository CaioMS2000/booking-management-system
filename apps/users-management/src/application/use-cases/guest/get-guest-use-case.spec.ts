import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { beforeEach, describe, expect, it } from 'vitest'
import { requestContext } from '@/context/request-context'
import { makeAppContext } from '@/test/factories/make-app-context'
import { makeGuest } from '@/test/factories/make-guest'
import { GuestNotFoundError, UnauthorizedError } from '../../@errors'
import { GuestRepository } from '../../repositories/guest-repository'
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
		return requestContext.run(makeAppContext(), async () => {
			when(guestRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				requesterId: 'some-id',
				requesterRole: 'ADMIN',
				guestId: 'non-existent-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(GuestNotFoundError)
		})
	})

	it('should return success when guest accesses own profile', () => {
		return requestContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()

			when(guestRepo.findById(anything())).thenResolve(guest)

			const result = await sut.execute({
				requesterId: guest.id,
				requesterRole: 'GUEST',
				guestId: guest.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.guest).toEqual(guest)
			}
		})
	})

	it('should return success when admin accesses any guest profile', () => {
		return requestContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()

			when(guestRepo.findById(anything())).thenResolve(guest)

			const result = await sut.execute({
				requesterId: 'admin-id',
				requesterRole: 'ADMIN',
				guestId: guest.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.guest).toEqual(guest)
			}
		})
	})

	it('should return failure when guest tries to access another guest profile', () => {
		return requestContext.run(makeAppContext(), async () => {
			const result = await sut.execute({
				requesterId: 'other-guest-id',
				requesterRole: 'GUEST',
				guestId: 'target-guest-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(UnauthorizedError)
		})
	})
})
