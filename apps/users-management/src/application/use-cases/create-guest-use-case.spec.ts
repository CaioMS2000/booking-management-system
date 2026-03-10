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
import { FakeIdGenerator } from '@/test/fake-id-generator'
import { InvalidEmailError, InvalidPhoneError } from '../@errors'
import { GuestRepository } from '../repositories/guest-repository'
import { CreateGuestUseCase } from './create-guest-use-case'

describe('CreateGuestUseCase', () => {
	let guestRepo: GuestRepository
	let sut: CreateGuestUseCase

	beforeEach(() => {
		guestRepo = mock(GuestRepository)
		when(guestRepo.save(anything())).thenResolve()
		sut = new CreateGuestUseCase({
			guestRepository: instance(guestRepo),
			idGeneratorV7: new FakeIdGenerator(),
		})
	})

	it('should return failure when email is invalid', () => {
		return requestContext.run(makeAppContext(), async () => {
			const result = await sut.execute({
				name: 'Jane Doe',
				email: 'invalid-email',
				phone: '5599999999999',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidEmailError)
		})
	})

	it('should return failure when phone is invalid', () => {
		return requestContext.run(makeAppContext(), async () => {
			const result = await sut.execute({
				name: 'Jane Doe',
				email: 'jane@example.com',
				phone: '123',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidPhoneError)
		})
	})

	it('should return success with created guest', () => {
		return requestContext.run(makeAppContext(), async () => {
			const result = await sut.execute({
				name: 'Jane Doe',
				email: 'jane@example.com',
				phone: '5599999999999',
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				const { guest } = result.value
				expect(guest.name).toBe('Jane Doe')
				expect(guest.email.value).toBe('jane@example.com')
				expect(guest.phone.value).toBe('5599999999999')
				expect(guest.isDeleted).toBe(false)
			}
			verify(guestRepo.save(anything())).once()
		})
	})
})
