import { Listing } from '../../domain/entities/listing'

export abstract class ListingRepository {
	abstract save(listing: Listing): Promise<void>
}
