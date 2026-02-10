import { describe, it, expect, beforeEach } from 'vitest'
import { mock, instance, when, anything } from '@johanblumenberg/ts-mockito'
import { appContext } from '@/application-context'
import { makeAppContext } from '@/test/factories/make-app-context'
import { ListPropertiesQueryHandler } from './handler'
import { ListPropertiesQuery } from './query'
import { PropertyRepository } from '@/application/repositories/property-repository'
import { OwnerRepository } from '@/application/repositories/owner-repository'
import { makeProperty } from '@/test/factories/make-property'
import { makeOwner } from '@/test/factories/make-owner'

describe('ListPropertiesQueryHandler', () => {
	let propertyRepo: PropertyRepository
	let ownerRepo: OwnerRepository
	let sut: ListPropertiesQueryHandler

	beforeEach(() => {
		propertyRepo = mock(PropertyRepository)
		ownerRepo = mock(OwnerRepository)
		sut = new ListPropertiesQueryHandler(
			instance(propertyRepo),
			instance(ownerRepo)
		)
	})

	it('should map properties with their owners to the read model', () => {
		return appContext.run(makeAppContext(), async () => {
			const owner = await makeOwner()
			const property = await makeProperty(owner.id)
			const query = await ListPropertiesQuery.create()

			when(propertyRepo.findAll()).thenResolve([property])
			when(ownerRepo.getById(anything())).thenResolve(owner)

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
				owner: {
					name: owner.name,
					email: owner.email,
					phone: owner.phone,
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
