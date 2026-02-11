import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { beforeEach, describe, expect, it } from 'vitest'
import { UniqueEntityID } from '@repo/core'
import { OwnerRepository } from '@/application/repositories/owner-repository'
import { OwnerNotFoundError } from '@/application/@errors'
import { appContext } from '@/application-context'
import { makeAppContext } from '@/test/factories/make-app-context'
import { makeOwner } from '@/test/factories/make-owner'
import { RegisterPropertyCommandHandler } from './handler'
import { RegisterPropertyCommand } from './command'
import { PropertyRepository } from '@/application/repositories/property-repository'

describe('RegisterPropertyCommandHandler', () => {
	let ownerRepo: OwnerRepository
	let propertyRepo: PropertyRepository
	let sut: RegisterPropertyCommandHandler

	beforeEach(() => {
		ownerRepo = mock(OwnerRepository)
		propertyRepo = mock(PropertyRepository)
		sut = new RegisterPropertyCommandHandler(
			instance(ownerRepo),
			instance(propertyRepo)
		)
	})

	it('should return failure when owner is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(ownerRepo.findById(anything())).thenResolve(null)

			const command = await RegisterPropertyCommand.create({
				ownerId: new UniqueEntityID('non-existent-id'),
				name: 'Beach House',
				description: 'A nice beach house',
				capacity: 4,
				pricePerNight: { valueInCents: 15000, currency: 'BRL' },
				propertyType: 'Apartment',
				address: {
					street: 'Rua X',
					city: 'São Paulo',
					state: 'SP',
					country: 'BR',
					zipCode: '01234567',
				},
				publicId: 1,
			})

			const result = await sut.execute(command)

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(OwnerNotFoundError)
			verify(propertyRepo.save(anything())).never()
		})
	})

	it('should create and save property successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			const owner = await makeOwner()
			when(ownerRepo.findById(owner.id)).thenResolve(owner)
			when(propertyRepo.save(anything())).thenResolve()

			const command = await RegisterPropertyCommand.create({
				ownerId: owner.id,
				name: 'Beach House',
				description: 'A nice beach house',
				capacity: 4,
				pricePerNight: { valueInCents: 15000, currency: 'BRL' },
				propertyType: 'Apartment',
				address: {
					street: 'Rua X',
					city: 'São Paulo',
					state: 'SP',
					country: 'BR',
					zipCode: '01234567',
				},
				publicId: 1,
			})

			const result = await sut.execute(command)

			expect(result.isSuccess()).toBe(true)
			verify(propertyRepo.save(anything())).once()
		})
	})
})
