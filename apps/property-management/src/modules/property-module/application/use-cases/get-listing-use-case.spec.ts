import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { appContext } from '@/application-context'
import { ListingNotFoundError } from '../@errors'
import { ListingRepository } from '../repositories/listing-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { makeListing } from '@/modules/property-module/test/factories/make-listing'
import { GetListingUseCase } from './get-listing-use-case'

describe('GetListingUseCase', () => {
	let listingRepo: ListingRepository
	let sut: GetListingUseCase

	beforeEach(() => {
		listingRepo = mock(ListingRepository)
		sut = new GetListingUseCase({
			listingRepository: instance(listingRepo),
		})
	})

	it('should return failure when listing is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(listingRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				listingId: 'non-existent-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(ListingNotFoundError)
		})
	})

	it('should return success with listing', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)
			const listing = await makeListing(property.id)

			when(listingRepo.findById(anything())).thenResolve(listing)

			const result = await sut.execute({
				listingId: listing.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.listing).toEqual(listing)
			}
		})
	})
})
