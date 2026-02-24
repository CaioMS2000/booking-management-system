import { UniqueId } from '@repo/core'
import { Listing } from '@/modules/property-module/domain/models/listing'
import { Pagination } from './params'

export type ListingFilters = {
	capacity?: number
	minPrice?: number
	maxPrice?: number
	currency?: string
}

export abstract class ListingRepository {
	abstract save(listing: Listing): Promise<void>
	abstract update(listing: Listing): Promise<void>
	abstract delete(listing: Listing): Promise<void>
	abstract findById(id: UniqueId): Promise<Listing | null>
	abstract getById(id: UniqueId): Promise<Listing>
	abstract findManyByHostId(hostId: UniqueId): Promise<Listing[]>
	abstract findManyByPropertyId(propertyId: UniqueId): Promise<Listing[]>
	abstract findMany(
		filters?: ListingFilters,
		pagination?: Pagination
	): Promise<Listing[]>
}
