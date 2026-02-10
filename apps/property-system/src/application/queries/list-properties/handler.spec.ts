import { describe, it, expect, beforeEach } from 'vitest'
import { mock, instance, when, anything } from '@johanblumenberg/ts-mockito'
import { UniqueEntityID, Email, Phone } from '@repo/core'
import { appContext } from '@/application-context'
import { makeAppContext } from '@/test/factories/make-app-context'
import { ListPropertiesQueryHandler } from './handler'
import { ListPropertiesQuery } from './query'
import { PropertyRepository } from '@/application/repositories/property-repository'
import { OwnerRepository } from '@/application/repositories/owner-repository'
import { Property } from '@/domain/entities/property'
import { Owner } from '@/domain/entities/owner'
import { makeAddress } from '@/test/factories/make-address'
import { Money } from '@/domain/value-object/money'

function makeProperty(overrides?: { id?: string; ownerId?: string }): Property {
	return Property.create({
		id: new UniqueEntityID(overrides?.id ?? 'property-1'),
		ownerId: new UniqueEntityID(overrides?.ownerId ?? 'owner-1'),
		name: 'Beach House',
		description: 'A nice beach house',
		capacity: 4,
		pricePerNight: Money.create({ valueInCents: 15000, currency: 'BRL' }),
		propertyType: 'House',
		address: makeAddress(),
	})
}

function makeOwner(overrides?: { id?: string }): Owner {
	const email = Email.create('owner@example.com')
	const phone = Phone.create('5511999999999')
	if (email.isFailure()) throw new Error('bad email fixture')
	if (phone.isFailure()) throw new Error('bad phone fixture')

	return Owner.create({
		id: new UniqueEntityID(overrides?.id ?? 'owner-1'),
		name: 'John Owner',
		email: email.value,
		phone: phone.value,
	})
}

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
			const property = makeProperty()
			const owner = makeOwner()
			const query = await ListPropertiesQuery.create()

			when(propertyRepo.getAll()).thenResolve([property])
			when(ownerRepo.get(anything())).thenResolve(owner)

			const result = await sut.execute(query)

			expect(result).toHaveLength(1)
			expect(result[0]).toEqual({
				name: 'Beach House',
				description: 'A nice beach house',
				capacity: 4,
				pricePerNight: property.pricePerNight,
				propertyType: 'House',
				address: property.address,
				status: 'active',
				imagesUrls: [],
				owner: {
					name: 'John Owner',
					email: owner.email,
					phone: owner.phone,
				},
			})
		})
	})

	it('should return empty array when there are no properties', () => {
		return appContext.run(makeAppContext(), async () => {
			const query = await ListPropertiesQuery.create()

			when(propertyRepo.getAll()).thenResolve([])

			const result = await sut.execute(query)

			expect(result).toEqual([])
		})
	})
})
