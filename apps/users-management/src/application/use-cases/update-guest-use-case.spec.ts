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
import {
	GuestNotFoundError,
	InvalidEmailError,
	InvalidPhoneError,
} from '../@errors'
import { GuestRepository } from '../repositories/guest-repository'
import { UpdateGuestUseCase } from './update-guest-use-case'

describe('UpdateGuestUseCase', () => {
	let guestRepo: GuestRepository
	let sut: UpdateGuestUseCase

	beforeEach(() => {
		guestRepo = mock(GuestRepository)
		sut = new UpdateGuestUseCase({
			guestRepository: instance(guestRepo),
		})
	})

	it('should return failure when guest is not found', () => {
		return requestContext.run(makeAppContext(), async () => {
			when(guestRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				guestId: 'non-existent-id',
				name: 'New Name',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(GuestNotFoundError)
		})
	})

	it('should return failure when email is invalid', () => {
		return requestContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()
			when(guestRepo.findById(anything())).thenResolve(guest)

			const result = await sut.execute({
				guestId: guest.id,
				email: 'invalid-email',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidEmailError)
		})
	})

	it('should return failure when phone is invalid', () => {
		return requestContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()
			when(guestRepo.findById(anything())).thenResolve(guest)

			const result = await sut.execute({
				guestId: guest.id,
				phone: '123',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidPhoneError)
		})
	})

	it('should update guest name successfully', () => {
		return requestContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()
			when(guestRepo.findById(anything())).thenResolve(guest)
			when(guestRepo.update(anything())).thenResolve()

			const result = await sut.execute({
				guestId: guest.id,
				name: 'Updated Name',
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.guest.name).toBe('Updated Name')
				expect(result.value.guest.email).toEqual(guest.email)
				expect(result.value.guest.phone).toEqual(guest.phone)
			}
			verify(guestRepo.update(anything())).once()
		})
	})

	it('should update guest email successfully', () => {
		return requestContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()
			when(guestRepo.findById(anything())).thenResolve(guest)
			when(guestRepo.update(anything())).thenResolve()

			const result = await sut.execute({
				guestId: guest.id,
				email: 'new@email.com',
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.guest.email.value).toBe('new@email.com')
			}
		})
	})
})
