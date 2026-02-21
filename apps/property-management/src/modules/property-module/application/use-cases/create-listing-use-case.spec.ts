import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { appContext } from '@/application-context'
import { HostNotFoundError, PropertyNotFoundError } from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { PropertyRepository } from '../repositories/property-repository'
import { ListingRepository } from '../repositories/listing-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { CreateListingUseCase } from './create-listing-use-case'
import { UniqueId } from '@repo/core'

describe('CreateListingUseCase', () => {
	let hostRepo: HostRepository
	let propertyRepo: PropertyRepository
	let listingRepo: ListingRepository
	let sut: CreateListingUseCase

	beforeEach(() => {
		hostRepo = mock(HostRepository)
		propertyRepo = mock(PropertyRepository)
		listingRepo = mock(ListingRepository)
		sut = new CreateListingUseCase({
			hostRepository: instance(hostRepo),
			propertyRepository: instance(propertyRepo),
			listingRepository: instance(listingRepo),
		})
	})

	it('should return failure when host is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(hostRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				hostId: UniqueId('non-existent-id'),
				propertyId: UniqueId('some-property-id'),
				pricePerNight: { valueInCents: 10000, currency: 'USD' },
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
				propertyId: UniqueId('non-existent-property'),
				pricePerNight: { valueInCents: 10000, currency: 'USD' },
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(PropertyNotFoundError)
		})
	})

	it('should return success with created listing', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)

			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.findById(anything())).thenResolve(property)
			when(listingRepo.save(anything())).thenResolve()

			const result = await sut.execute({
				hostId: host.id,
				propertyId: property.id,
				pricePerNight: { valueInCents: 15000, currency: 'BRL' },
				intervals: [
					{
						from: new Date('2026-03-01'),
						to: new Date('2026-03-15'),
						status: 'AVAILABLE',
					},
				],
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				const { listing } = result.value
				expect(listing.pricePerNight).toEqual({
					valueInCents: 15000,
					currency: 'BRL',
				})
				expect(listing.propertyId).toBe(property.id)
				expect(listing.intervals).toEqual([
					{
						from: new Date('2026-03-01'),
						to: new Date('2026-03-15'),
						status: 'AVAILABLE',
					},
				])
			}
		})
	})

	it('should save listing to repository', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)

			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.findById(anything())).thenResolve(property)
			when(listingRepo.save(anything())).thenResolve()

			await sut.execute({
				hostId: host.id,
				propertyId: property.id,
				pricePerNight: { valueInCents: 10000, currency: 'USD' },
			})

			verify(listingRepo.save(anything())).once()
		})
	})
})
