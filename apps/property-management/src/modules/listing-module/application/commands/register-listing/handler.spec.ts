import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { UniqueEntityID } from '@repo/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { appContext } from '@/application-context'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { RegisterListingCommand } from './command'
import { RegisterListingCommandHandler } from './handler'
import { PropertyModuleInterface } from '@repo/modules-contracts'
import { ListingRepository } from '../../repositories'
import { makeMoney } from '@/modules/listing-module/test/factories/make-money'
import { makePropertyDTO } from '@/modules/listing-module/test/factories/make-property-dto'
import { PropertyNotFoundError } from '../../@errors'

describe('RegisterListingCommandHandler', () => {
	let propertyModule: PropertyModuleInterface
	let listingRepository: ListingRepository
	let sut: RegisterListingCommandHandler

	beforeEach(() => {
		propertyModule = mock(PropertyModuleInterface)
		listingRepository = mock(ListingRepository)
		sut = new RegisterListingCommandHandler(
			instance(propertyModule),
			instance(listingRepository)
		)
	})

	it('should return failure when property is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(propertyModule.findProperty(anything())).thenResolve(null)

			const command = await RegisterListingCommand.create({
				hostId: new UniqueEntityID('any-host-id'),
				pricePerNight: makeMoney(),
				propertyId: new UniqueEntityID('non-existent-id'),
			})

			const result = await sut.execute(command)

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(PropertyNotFoundError)
			verify(listingRepository.save(anything())).never()
		})
	})

	it('should create and save listing successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			const propertyDTO = makePropertyDTO()

			when(propertyModule.findProperty(propertyDTO.id)).thenResolve(propertyDTO)
			when(listingRepository.save(anything())).thenResolve()

			const command = await RegisterListingCommand.create({
				hostId: new UniqueEntityID(propertyDTO.hostId),
				pricePerNight: makeMoney(),
				propertyId: new UniqueEntityID(propertyDTO.id),
			})

			const result = await sut.execute(command)

			expect(result.isSuccess()).toBe(true)
			verify(listingRepository.save(anything())).once()
		})
	})
})
