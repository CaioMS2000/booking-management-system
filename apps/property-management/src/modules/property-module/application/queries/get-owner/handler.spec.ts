import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { beforeEach, describe, expect, it } from 'vitest'
import { appContext } from '@/application-context'
import {
	OwnerNotFoundError,
	PropertyNotFoundError,
} from '@/modules/property-module/application/@errors'
import { OwnerRepository } from '@/modules/property-module/application/repositories/owner-repository'
import { PropertyRepository } from '@/modules/property-module/application/repositories/property-repository'
import { makeAppContext } from '@/test/factories/make-app-context'
import { makeOwner } from '@/test/factories/make-owner'
import { makeProperty } from '@/test/factories/make-property'
import { GetOwnerQueryHandler } from './handler'
import { GetOwnerQuery } from './query'

describe('GetOwnerQueryHandler', () => {
	let propertyRepo: PropertyRepository
	let ownerRepo: OwnerRepository
	let sut: GetOwnerQueryHandler

	beforeEach(() => {
		propertyRepo = mock(PropertyRepository)
		ownerRepo = mock(OwnerRepository)
		sut = new GetOwnerQueryHandler(instance(propertyRepo), instance(ownerRepo))
	})

	it('should return failure when owner is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			const query = await GetOwnerQuery.create({
				ownerId: 'non-existent-id',
			})

			when(ownerRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute(query)

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(OwnerNotFoundError)
		})
	})

	it('should return success with owner', () => {
		return appContext.run(makeAppContext(), async () => {
			const owner = await makeOwner()
			// const property = await makeProperty(owner.id)
			const query = await GetOwnerQuery.create({
				ownerId: owner.id.toString(),
			})

			when(ownerRepo.findById(anything())).thenResolve(owner)
			when(propertyRepo.findManyByOwnerId(anything())).thenResolve([])

			const result = await sut.execute(query)

			expect(result.isSuccess()).toBe(true)
			expect(result.value).toEqual({
				name: owner.name,
				email: owner.email,
				phone: owner.phone,
				propertiesIds: owner.propertiesIds,
			})
		})
	})
})
