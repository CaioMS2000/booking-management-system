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
import { AdminRepository } from '../repositories/admin-repository'
import { makeAppContext } from '@/test/factories/make-app-context'
import { FakeIdGenerator } from '@/test/fake-id-generator'
import { CreateAdminUseCase } from './create-admin-use-case'

describe('CreateAdminUseCase', () => {
	let adminRepo: AdminRepository
	let sut: CreateAdminUseCase

	beforeEach(() => {
		adminRepo = mock(AdminRepository)
		when(adminRepo.save(anything())).thenResolve()
		sut = new CreateAdminUseCase({
			adminRepository: instance(adminRepo),
			idGeneratorV7: new FakeIdGenerator(),
		})
	})

	it('should return failure when email is invalid', () => {
		return requestContext.run(makeAppContext(), async () => {
			const result = await sut.execute({
				name: 'Admin User',
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
				name: 'Admin User',
				email: 'admin@example.com',
				phone: '123',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidPhoneError)
		})
	})

	it('should return success with created admin', () => {
		return requestContext.run(makeAppContext(), async () => {
			const result = await sut.execute({
				name: 'Admin User',
				email: 'admin@example.com',
				phone: '5599999999999',
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				const { admin } = result.value
				expect(admin.name).toBe('Admin User')
				expect(admin.email.value).toBe('admin@example.com')
				expect(admin.phone.value).toBe('5599999999999')
				expect(admin.isDeleted).toBe(false)
			}
			verify(adminRepo.save(anything())).once()
		})
	})
})
