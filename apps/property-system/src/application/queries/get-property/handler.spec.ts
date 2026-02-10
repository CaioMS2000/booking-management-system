import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mock, instance, when, anything } from '@johanblumenberg/ts-mockito'
import { appContext } from '@/application-context'

vi.mock('@/logging/logger', () => ({
	createLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		child: vi.fn(),
	}),
}))
import { makeAppContext } from '@/test/factories/make-app-context'
import { GetPropertyQueryHandler } from './handler'
import { GetPropertyQuery } from './query'
import { PropertyRepository } from '@/application/repositories/property-repository'
import { OwnerRepository } from '@/application/repositories/owner-repository'
import { makeProperty } from '@/test/factories/make-property'
import { makeOwner } from '@/test/factories/make-owner'

describe('GetPropertyQueryHandler', () => {
	let propertyRepo: PropertyRepository
	let ownerRepo: OwnerRepository
	let sut: GetPropertyQueryHandler

	beforeEach(() => {
		propertyRepo = mock(PropertyRepository)
		ownerRepo = mock(OwnerRepository)
		sut = new GetPropertyQueryHandler(
			instance(propertyRepo),
			instance(ownerRepo)
		)
	})

	it('should return null when property is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			const query = await GetPropertyQuery.create({
				propertyId: 'non-existent-id',
			})

			when(propertyRepo.get(anything())).thenReject(
				new Error('Property not found')
			)

			const result = await sut.execute(query)

			expect(result).toBeNull()
		})
	})

	it('should return property with owner data', () => {
		return appContext.run(makeAppContext(), async () => {
			const owner = await makeOwner()
			const property = await makeProperty(owner.id)
			const query = await GetPropertyQuery.create({
				propertyId: property.id.toString(),
			})

			when(propertyRepo.get(anything())).thenResolve(property)
			when(ownerRepo.get(anything())).thenResolve(owner)

			const result = await sut.execute(query)

			expect(result).toEqual({
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
})
