import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { appContext } from '@/application-context'
import { HostNotFoundError } from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
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
		return appContext.run(makeAppContext(), async () => {
			when(hostRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				hostId: 'non-existent-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(HostNotFoundError)
		})
	})

	it('should return success with host', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()

			when(hostRepo.findById(anything())).thenResolve(host)

			const result = await sut.execute({
				hostId: host.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.host).toEqual(host)
			}
		})
	})
})
