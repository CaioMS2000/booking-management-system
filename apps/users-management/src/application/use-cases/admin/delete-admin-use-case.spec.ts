import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { beforeEach, describe, expect, it } from 'vitest'
import { requestContext } from '@/context/request-context'
import { makeAdmin } from '@/test/factories/make-admin'
import { makeAppContext } from '@/test/factories/make-app-context'
import { AdminNotFoundError } from '../../@errors'
import { AdminRepository } from '../../repositories/admin-repository'
import { DeleteAdminUseCase } from './delete-admin-use-case'

describe('DeleteAdminUseCase', () => {
	let adminRepo: AdminRepository
	let sut: DeleteAdminUseCase

	beforeEach(() => {
		adminRepo = mock(AdminRepository)
		sut = new DeleteAdminUseCase({
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

	it('should soft delete admin successfully', () => {
		return requestContext.run(makeAppContext(), async () => {
			const admin = await makeAdmin()
			when(adminRepo.findById(anything())).thenResolve(admin)
			when(adminRepo.delete(anything())).thenResolve()

			const result = await sut.execute({
				adminId: admin.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.isDeleted).toBe(true)
				expect(result.value.deletedAt).toBeInstanceOf(Date)
			}
			verify(adminRepo.delete(anything())).once()
		})
	})
})
