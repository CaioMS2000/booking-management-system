import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { requestContext } from '@/context/request-context'
import {
	AdminNotFoundError,
	InvalidEmailError,
	InvalidPhoneError,
} from '../@errors'
import { AdminRepository } from '../repositories/admin-repository'
import { makeAppContext } from '@/test/factories/make-app-context'
import { makeAdmin } from '@/test/factories/make-admin'
import { UpdateAdminUseCase } from './update-admin-use-case'

describe('UpdateAdminUseCase', () => {
	let adminRepo: AdminRepository
	let sut: UpdateAdminUseCase

	beforeEach(() => {
		adminRepo = mock(AdminRepository)
		sut = new UpdateAdminUseCase({
			adminRepository: instance(adminRepo),
		})
	})

	it('should return failure when admin is not found', () => {
		return requestContext.run(makeAppContext(), async () => {
			when(adminRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				adminId: 'non-existent-id',
				name: 'New Name',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(AdminNotFoundError)
		})
	})

	it('should return failure when email is invalid', () => {
		return requestContext.run(makeAppContext(), async () => {
			const admin = await makeAdmin()
			when(adminRepo.findById(anything())).thenResolve(admin)

			const result = await sut.execute({
				adminId: admin.id,
				email: 'invalid-email',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidEmailError)
		})
	})

	it('should return failure when phone is invalid', () => {
		return requestContext.run(makeAppContext(), async () => {
			const admin = await makeAdmin()
			when(adminRepo.findById(anything())).thenResolve(admin)

			const result = await sut.execute({
				adminId: admin.id,
				phone: '123',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidPhoneError)
		})
	})

	it('should update admin name successfully', () => {
		return requestContext.run(makeAppContext(), async () => {
			const admin = await makeAdmin()
			when(adminRepo.findById(anything())).thenResolve(admin)
			when(adminRepo.update(anything())).thenResolve()

			const result = await sut.execute({
				adminId: admin.id,
				name: 'Updated Name',
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.admin.name).toBe('Updated Name')
				expect(result.value.admin.email).toEqual(admin.email)
				expect(result.value.admin.phone).toEqual(admin.phone)
			}
			verify(adminRepo.update(anything())).once()
		})
	})

	it('should update admin email successfully', () => {
		return requestContext.run(makeAppContext(), async () => {
			const admin = await makeAdmin()
			when(adminRepo.findById(anything())).thenResolve(admin)
			when(adminRepo.update(anything())).thenResolve()

			const result = await sut.execute({
				adminId: admin.id,
				email: 'new@email.com',
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.admin.email.value).toBe('new@email.com')
			}
		})
	})
})
