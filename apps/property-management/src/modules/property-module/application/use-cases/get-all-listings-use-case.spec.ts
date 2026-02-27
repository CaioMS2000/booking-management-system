import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { appContext } from '@/context/application-context'
import { ListingRepository } from '../repositories/listing-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { makeListing } from '@/modules/property-module/test/factories/make-listing'
import { GetAllListingsUseCase } from './get-all-listings-use-case'

describe('GetAllListingsUseCase', () => {
	let listingRepo: ListingRepository
	let sut: GetAllListingsUseCase

	beforeEach(() => {
		listingRepo = mock(ListingRepository)
		sut = new GetAllListingsUseCase({
			listingRepository: instance(listingRepo),
		})
	})

	it('should return listings with default pagination', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)
			const listing = await makeListing(property.id)

			when(listingRepo.findMany(anything(), anything())).thenResolve([listing])

			const result = await sut.execute({})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.listings).toHaveLength(1)
				expect(result.value.listings[0]).toEqual(listing)
			}
		})
	})

	it('should return empty list when no listings match', () => {
		return appContext.run(makeAppContext(), async () => {
			when(listingRepo.findMany(anything(), anything())).thenResolve([])

			const result = await sut.execute({
				filters: { minPrice: 100000 },
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.listings).toHaveLength(0)
			}
		})
	})

	it('should pass pagination parameters', () => {
		return appContext.run(makeAppContext(), async () => {
			when(listingRepo.findMany(anything(), anything())).thenResolve([])

			const result = await sut.execute({
				page: 2,
				limit: 10,
			})

			expect(result.isSuccess()).toBe(true)
		})
	})
})
