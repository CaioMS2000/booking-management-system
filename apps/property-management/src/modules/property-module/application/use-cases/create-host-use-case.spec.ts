import { describe, expect, it, beforeEach } from 'vitest'
import { appContext } from '@/context/application-context'
import { InvalidEmailError, InvalidPhoneError } from '../@errors'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { CreateHostUseCase } from './create-host-use-case'

describe('CreateHostUseCase', () => {
	let sut: CreateHostUseCase

	beforeEach(() => {
		sut = new CreateHostUseCase()
	})

	it('should return failure when email is invalid', () => {
		return appContext.run(makeAppContext(), async () => {
			const result = await sut.execute({
				name: 'John Doe',
				email: 'invalid-email',
				phone: '5599999999999',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidEmailError)
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
		})
	})

	it('should return success with created host', () => {
		return appContext.run(makeAppContext(), async () => {
			const result = await sut.execute({
				name: 'John Doe',
				email: 'john@example.com',
				phone: '5599999999999',
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				const { host } = result.value
				expect(host.name).toBe('John Doe')
				expect(host.email.value).toBe('john@example.com')
				expect(host.phone.value).toBe('5599999999999')
			}
		})
	})
})
