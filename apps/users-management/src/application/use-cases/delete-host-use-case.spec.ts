import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { requestContext } from '@/context/request-context'
import { HostNotFoundError } from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { makeAppContext } from '@/test/factories/make-app-context'
import { makeHost } from '@/test/factories/make-host'
import { DeleteHostUseCase } from './delete-host-use-case'

describe('DeleteHostUseCase', () => {
	let hostRepo: HostRepository
	let sut: DeleteHostUseCase

	beforeEach(() => {
		hostRepo = mock(HostRepository)
		sut = new DeleteHostUseCase({
			hostRepository: instance(hostRepo),
		})
	})

	it('should return failure when host is not found', () => {
		return requestContext.run(makeAppContext(), async () => {
			when(hostRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				hostId: 'non-existent-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(HostNotFoundError)
		})
	})

	it('should soft delete host successfully', () => {
		return requestContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			when(hostRepo.findById(anything())).thenResolve(host)
			when(hostRepo.delete(anything())).thenResolve()

			const result = await sut.execute({
				hostId: host.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.isDeleted).toBe(true)
				expect(result.value.deletedAt).toBeInstanceOf(Date)
			}
			verify(hostRepo.delete(anything())).once()
		})
	})
})
