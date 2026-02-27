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
	ListingNotFoundError,
	PropertyNotFoundError,
	ListingNotOwnedByHostError,
} from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { PropertyRepository } from '../repositories/property-repository'
import { ListingRepository } from '../repositories/listing-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { makeListing } from '@/modules/property-module/test/factories/make-listing'
import { UpdateListingUseCase } from './update-listing-use-case'

describe('UpdateListingUseCase', () => {
	let hostRepo: HostRepository
	let propertyRepo: PropertyRepository
	let listingRepo: ListingRepository
	let sut: UpdateListingUseCase

	beforeEach(() => {
		hostRepo = mock(HostRepository)
		propertyRepo = mock(PropertyRepository)
		listingRepo = mock(ListingRepository)
		sut = new UpdateListingUseCase({
			hostRepository: instance(hostRepo),
			propertyRepository: instance(propertyRepo),
			listingRepository: instance(listingRepo),
		})
	})

	it('should return failure when host is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(hostRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				listingId: 'some-listing-id',
				hostId: 'non-existent-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(HostNotFoundError)
		})
	})

	it('should return failure when listing is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			when(hostRepo.findById(anything())).thenResolve(host)
			when(listingRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				listingId: 'non-existent-listing',
				hostId: host.id,
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(ListingNotFoundError)
		})
	})

	it('should return failure when property is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const otherHost = await makeHost()
			const property = await makeProperty(otherHost.id)
			const listing = await makeListing(property.id)

			when(hostRepo.findById(anything())).thenResolve(host)
			when(listingRepo.findById(anything())).thenResolve(listing)
			when(propertyRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				listingId: listing.id,
				hostId: host.id,
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(PropertyNotFoundError)
		})
	})

	it('should return failure when listing does not belong to host', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const otherHost = await makeHost()
			const property = await makeProperty(otherHost.id)
			const listing = await makeListing(property.id)

			when(hostRepo.findById(anything())).thenResolve(host)
			when(listingRepo.findById(anything())).thenResolve(listing)
			when(propertyRepo.findById(anything())).thenResolve(property)

			const result = await sut.execute({
				listingId: listing.id,
				hostId: host.id,
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(ListingNotOwnedByHostError)
		})
	})

	it('should update listing price successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)
			const listing = await makeListing(property.id)

			when(hostRepo.findById(anything())).thenResolve(host)
			when(listingRepo.findById(anything())).thenResolve(listing)
			when(propertyRepo.findById(anything())).thenResolve(property)
			when(listingRepo.update(anything())).thenResolve()

			const newPrice = { valueInCents: 25000, currency: 'BRL' as const }

			const result = await sut.execute({
				listingId: listing.id,
				hostId: host.id,
				pricePerNight: newPrice,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.listing.pricePerNight).toEqual(newPrice)
				expect(result.value.listing.propertyId).toBe(listing.propertyId)
			}
			verify(listingRepo.update(anything())).once()
		})
	})
})
