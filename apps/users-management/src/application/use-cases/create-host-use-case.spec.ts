import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { requestContext } from '@/context/request-context'
import { InvalidEmailError, InvalidPhoneError } from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { makeAppContext } from '@/test/factories/make-app-context'
import { makeBankAccount } from '@/test/factories/make-bank-account'
import { FakeIdGenerator } from '@/test/fake-id-generator'
import { CreateHostUseCase } from './create-host-use-case'

describe('CreateHostUseCase', () => {
	let hostRepo: HostRepository
	let sut: CreateHostUseCase

	beforeEach(() => {
		hostRepo = mock(HostRepository)
		when(hostRepo.save(anything())).thenResolve()
		sut = new CreateHostUseCase({
			hostRepository: instance(hostRepo),
			idGeneratorV7: new FakeIdGenerator(),
		})
	})

	it('should return failure when email is invalid', () => {
		return requestContext.run(makeAppContext(), async () => {
			const bankAccount = await makeBankAccount()

			const result = await sut.execute({
				name: 'John Doe',
				email: 'invalid-email',
				phone: '5599999999999',
				bankAccount,
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidEmailError)
		})
	})

	it('should return failure when phone is invalid', () => {
		return requestContext.run(makeAppContext(), async () => {
			const bankAccount = await makeBankAccount()

			const result = await sut.execute({
				name: 'John Doe',
				email: 'john@example.com',
				phone: '123',
				bankAccount,
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidPhoneError)
		})
	})

	it('should return success with created host', () => {
		return requestContext.run(makeAppContext(), async () => {
			const bankAccount = await makeBankAccount()

			const result = await sut.execute({
				name: 'John Doe',
				email: 'john@example.com',
				phone: '5599999999999',
				bankAccount,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				const { host } = result.value
				expect(host.name).toBe('John Doe')
				expect(host.email.value).toBe('john@example.com')
				expect(host.phone.value).toBe('5599999999999')
				expect(host.isDeleted).toBe(false)
			}
			verify(hostRepo.save(anything())).once()
		})
	})
})
