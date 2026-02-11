import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { beforeEach, describe, expect, it } from 'vitest'
import { appContext } from '@/application-context'
import { HostNotFoundError } from '@/modules/property-module/application/@errors'
import { HostRepository } from '@/modules/property-module/application/repositories/host-repository'
import { PropertyRepository } from '@/modules/property-module/application/repositories/property-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { GetHostQueryHandler } from './handler'
import { GetHostQuery } from './query'

describe('GetHostQueryHandler', () => {
	let propertyRepo: PropertyRepository
	let hostRepo: HostRepository
	let sut: GetHostQueryHandler

	beforeEach(() => {
		propertyRepo = mock(PropertyRepository)
		hostRepo = mock(HostRepository)
		sut = new GetHostQueryHandler(instance(propertyRepo), instance(hostRepo))
	})

	it('should return failure when host is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			const query = await GetHostQuery.create({
				hostId: 'non-existent-id',
			})

			when(hostRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute(query)

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(HostNotFoundError)
		})
	})

	it('should return success with host', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			// const property = await makeProperty(host.id)
			const query = await GetHostQuery.create({
				hostId: host.id.toString(),
			})

			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.findManyByHostId(anything())).thenResolve([])

			const result = await sut.execute(query)

			expect(result.isSuccess()).toBe(true)
			expect(result.value).toEqual({
				name: host.name,
				email: host.email,
				phone: host.phone,
				propertiesIds: host.propertiesIds,
			})
		})
	})
})
