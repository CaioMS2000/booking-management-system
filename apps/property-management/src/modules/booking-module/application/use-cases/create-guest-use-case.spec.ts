import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { appContext } from '@/context/application-context'
import { InvalidEmailError, InvalidPhoneError } from '../@errors'
import { GuestRepository } from '../repositories/guest-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { CreateGuestUseCase } from './create-guest-use-case'

describe('CreateGuestUseCase', () => {
	let guestRepo: GuestRepository
	let sut: CreateGuestUseCase

	beforeEach(() => {
		guestRepo = mock(GuestRepository)
		sut = new CreateGuestUseCase({
			guestRepository: instance(guestRepo),
		})
	})

	it('should return failure when email is invalid', () => {
		return appContext.run(makeAppContext(), async () => {
			const result = await sut.execute({
				name: 'John Doe',
				email: 'invalid-email',
				phone: '+5511999999999',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidEmailError)
			verify(guestRepo.save(anything())).never()
		})
	})

	it('should return failure when phone is invalid', () => {
		return appContext.run(makeAppContext(), async () => {
			const result = await sut.execute({
				name: 'John Doe',
				email: 'john@example.com',
				phone: '123',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidPhoneError)
			verify(guestRepo.save(anything())).never()
		})
	})

	it('should create guest successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			when(guestRepo.save(anything())).thenResolve()

			const result = await sut.execute({
				name: 'John Doe',
				email: 'john@example.com',
				phone: '+5511999999999',
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				const { guest } = result.value
				expect(guest.name).toBe('John Doe')
			}
			verify(guestRepo.save(anything())).once()
		})
	})
})
