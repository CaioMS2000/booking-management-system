import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { beforeEach, describe, expect, it } from 'vitest'
import { PropertyNotFoundError } from '@/modules/property-module/application/@errors'
import { HostRepository } from '@/modules/property-module/application/repositories/host-repository'
import { PropertyRepository } from '@/modules/property-module/application/repositories/property-repository'
import { appContext } from '@/modules/property-module/application-context'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { GetPropertyQueryHandler } from './handler'
import { GetPropertyQuery } from './query'

describe('GetPropertyQueryHandler', () => {
	let propertyRepo: PropertyRepository
	let hostRepo: HostRepository
	let sut: GetPropertyQueryHandler

	beforeEach(() => {
		propertyRepo = mock(PropertyRepository)
		hostRepo = mock(HostRepository)
		sut = new GetPropertyQueryHandler(
			instance(propertyRepo),
			instance(hostRepo)
		)
	})

	it('should return failure when property is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			const query = await GetPropertyQuery.create({
				propertyId: 'non-existent-id',
			})

			when(propertyRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute(query)

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(PropertyNotFoundError)
		})
	})

	it('should return success with property and host data', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)
			const query = await GetPropertyQuery.create({
				propertyId: property.id.toString(),
			})

			when(propertyRepo.findById(anything())).thenResolve(property)
			when(hostRepo.getById(anything())).thenResolve(host)

			const result = await sut.execute(query)

			expect(result.isSuccess()).toBe(true)
			expect(result.value).toEqual({
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
})
