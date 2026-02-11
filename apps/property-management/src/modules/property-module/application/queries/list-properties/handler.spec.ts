import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { beforeEach, describe, expect, it } from 'vitest'
import { HostRepository } from '@/modules/property-module/application/repositories/host-repository'
import { PropertyRepository } from '@/modules/property-module/application/repositories/property-repository'
import { appContext } from '@/modules/property-module/application-context'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { ListPropertiesQueryHandler } from './handler'
import { ListPropertiesQuery } from './query'

describe('ListPropertiesQueryHandler', () => {
	let propertyRepo: PropertyRepository
	let hostRepo: HostRepository
	let sut: ListPropertiesQueryHandler

	beforeEach(() => {
		propertyRepo = mock(PropertyRepository)
		hostRepo = mock(HostRepository)
		sut = new ListPropertiesQueryHandler(
			instance(propertyRepo),
			instance(hostRepo)
		)
	})

	it('should map properties with their hosts to the read model', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)
			const query = await ListPropertiesQuery.create()

			when(propertyRepo.findAll()).thenResolve([property])
			when(hostRepo.getById(anything())).thenResolve(host)

			const result = await sut.execute(query)

			expect(result).toHaveLength(1)
			expect(result[0]).toEqual({
				name: property.name,
				description: property.description,
				capacity: property.capacity,
				pricePerNight: property.pricePerNight,
				propertyType: property.type,
				address: property.address,
				status: property.status,
				imagesUrls: property.imagesUrls,
				host: {
					name: host.name,
					email: host.email,
					phone: host.phone,
				},
			})
		})
	})

	it('should return empty array when there are no properties', () => {
		return appContext.run(makeAppContext(), async () => {
			const query = await ListPropertiesQuery.create()

			when(propertyRepo.findAll()).thenResolve([])

			const result = await sut.execute(query)

			expect(result).toEqual([])
		})
	})
})
