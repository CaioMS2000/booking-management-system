import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { requestContext } from '@/context/request-context'
import { AdminNotFoundError } from '../@errors'
import { AdminRepository } from '../repositories/admin-repository'
import { makeAppContext } from '@/test/factories/make-app-context'
import { makeAdmin } from '@/test/factories/make-admin'
import { GetAdminUseCase } from './get-admin-use-case'

describe('GetAdminUseCase', () => {
	let adminRepo: AdminRepository
	let sut: GetAdminUseCase

	beforeEach(() => {
		adminRepo = mock(AdminRepository)
		sut = new GetAdminUseCase({
			adminRepository: instance(adminRepo),
		})
	})

	it('should return failure when admin is not found', () => {
		return requestContext.run(makeAppContext(), async () => {
			when(adminRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				adminId: 'non-existent-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(AdminNotFoundError)
		})
	})

	it('should return success with admin', () => {
		return requestContext.run(makeAppContext(), async () => {
			const admin = await makeAdmin()

			when(adminRepo.findById(anything())).thenResolve(admin)

			const result = await sut.execute({
				adminId: admin.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.admin).toEqual(admin)
			}
		})
	})
})
