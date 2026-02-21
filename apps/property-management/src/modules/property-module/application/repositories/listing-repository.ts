import { UniqueId } from '@repo/core'
import { Listing } from '@/modules/property-module/domain/models/listing'

export abstract class ListingRepository {
	abstract save(listing: Listing): Promise<void>
	abstract findById(id: UniqueId): Promise<Listing | null>
	abstract getById(id: UniqueId): Promise<Listing>
	abstract findManyByHostId(hostId: UniqueId): Promise<Listing[]>
}
