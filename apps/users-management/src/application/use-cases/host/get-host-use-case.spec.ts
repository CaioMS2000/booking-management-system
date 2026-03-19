import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { beforeEach, describe, expect, it } from 'vitest'
import { requestContext } from '@/context/request-context'
import { makeAppContext } from '@/test/factories/make-app-context'
import { makeHost } from '@/test/factories/make-host'
import { HostNotFoundError, UnauthorizedError } from '../../@errors'
import { HostRepository } from '../../repositories/host-repository'
import { GetHostUseCase } from './get-host-use-case'

describe('GetHostUseCase', () => {
	let hostRepo: HostRepository
	let sut: GetHostUseCase

	beforeEach(() => {
		hostRepo = mock(HostRepository)
		sut = new GetHostUseCase({
			hostRepository: instance(hostRepo),
		})
	})

	it('should return failure when host is not found', () => {
		return requestContext.run(makeAppContext(), async () => {
			when(hostRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				requesterId: 'some-id',
				requesterRole: 'ADMIN',
				hostId: 'non-existent-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(HostNotFoundError)
		})
	})

	it('should return success when host accesses own profile', () => {
		return requestContext.run(makeAppContext(), async () => {
			const host = await makeHost()

			when(hostRepo.findById(anything())).thenResolve(host)

			const result = await sut.execute({
				requesterId: host.id,
				requesterRole: 'HOST',
				hostId: host.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.host).toEqual(host)
			}
		})
	})

	it('should return success when admin accesses any host profile', () => {
		return requestContext.run(makeAppContext(), async () => {
			const host = await makeHost()

			when(hostRepo.findById(anything())).thenResolve(host)

			const result = await sut.execute({
				requesterId: 'admin-id',
				requesterRole: 'ADMIN',
				hostId: host.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.host).toEqual(host)
			}
		})
	})

	it('should return failure when host tries to access another host profile', () => {
		return requestContext.run(makeAppContext(), async () => {
			const result = await sut.execute({
				requesterId: 'other-host-id',
				requesterRole: 'HOST',
				hostId: 'target-host-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(UnauthorizedError)
		})
	})
})
