import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { appContext } from '@/context/application-context'
import {
	HostNotFoundError,
	PropertyNotFoundError,
	PropertyNotOwnedByHostError,
	PropertyHasActiveListingsError,
} from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { PropertyRepository } from '../repositories/property-repository'
import { ListingRepository } from '../repositories/listing-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { makeListing } from '@/modules/property-module/test/factories/make-listing'
import { DeletePropertyUseCase } from './delete-property-use-case'

describe('DeletePropertyUseCase', () => {
	let hostRepo: HostRepository
	let propertyRepo: PropertyRepository
	let listingRepo: ListingRepository
	let sut: DeletePropertyUseCase

	beforeEach(() => {
		hostRepo = mock(HostRepository)
		propertyRepo = mock(PropertyRepository)
		listingRepo = mock(ListingRepository)
		sut = new DeletePropertyUseCase({
			hostRepository: instance(hostRepo),
			propertyRepository: instance(propertyRepo),
			listingRepository: instance(listingRepo),
		})
	})

	it('should return failure when host is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(hostRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				hostId: 'non-existent-id',
				propertyId: 'some-property-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(HostNotFoundError)
		})
	})

	it('should return failure when property is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				hostId: host.id,
				propertyId: 'non-existent-property',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(PropertyNotFoundError)
		})
	})

	it('should return failure when property does not belong to host', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const otherHost = await makeHost()
			const property = await makeProperty(otherHost.id)

			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.findById(anything())).thenResolve(property)

			const result = await sut.execute({
				hostId: host.id,
				propertyId: property.id,
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(PropertyNotOwnedByHostError)
		})
	})

	it('should return failure when property has active listings', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)
			const listing = await makeListing(property.id)

			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.findById(anything())).thenResolve(property)
			when(listingRepo.findManyByPropertyId(anything())).thenResolve([listing])

			const result = await sut.execute({
				hostId: host.id,
				propertyId: property.id,
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(PropertyHasActiveListingsError)
		})
	})

	it('should delete property when no active listings', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)

			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.findById(anything())).thenResolve(property)
			when(listingRepo.findManyByPropertyId(anything())).thenResolve([])
			when(propertyRepo.delete(anything())).thenResolve()

			const result = await sut.execute({
				hostId: host.id,
				propertyId: property.id,
			})

			expect(result.isSuccess()).toBe(true)
			verify(propertyRepo.delete(anything())).once()
		})
	})

	it('should allow delete when all listings are already deleted', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)
			const listing = await makeListing(property.id)
			const deletedListing = listing.delete()

			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.findById(anything())).thenResolve(property)
			when(listingRepo.findManyByPropertyId(anything())).thenResolve([
				deletedListing,
			])
			when(propertyRepo.delete(anything())).thenResolve()

			const result = await sut.execute({
				hostId: host.id,
				propertyId: property.id,
			})

			expect(result.isSuccess()).toBe(true)
			verify(propertyRepo.delete(anything())).once()
		})
	})
})
