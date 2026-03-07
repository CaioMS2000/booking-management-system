import { type Currency, type IntervalStatus, UniqueId } from '@repo/core'
import { Listing } from '@/modules/property-module/domain/models/listing'
import type {
	ListingDrizzleInput,
	ListingDrizzleModel,
} from '../schemas/drizzle/listings'
import type {
	ListingIntervalDrizzleInput,
	ListingIntervalDrizzleModel,
} from '../schemas/drizzle/listing-intervals'

export class ListingMapper {
	static toDomain(
		row: ListingDrizzleModel,
		intervalRows: ListingIntervalDrizzleModel[]
	): Listing {
		return new Listing({
			id: UniqueId(row.id),
			propertyId: UniqueId(row.propertyId),
			publicId: row.publicId,
			pricePerNight: {
				valueInCents: row.pricePerNightCents,
				currency: row.currency as Currency,
			},
			intervals: intervalRows.map(i => ({
				from: i.from,
				to: i.to,
				status: i.status as IntervalStatus,
				expiresAt: i.expiresAt ?? undefined,
			})),
			deletedAt: row.deletedAt,
		})
	}

	static toPersistence(listing: Listing): {
		listing: ListingDrizzleInput
		intervals: Omit<ListingIntervalDrizzleInput, 'id'>[]
	} {
		return {
			listing: {
				id: listing.id,
				propertyId: listing.propertyId,
				publicId: listing.publicId,
				pricePerNightCents: listing.pricePerNight.valueInCents,
				currency: listing.pricePerNight.currency,
				deletedAt: listing.deletedAt,
			},
			intervals: listing.intervals.map(i => ({
				listingId: listing.id,
				from: i.from,
				to: i.to,
				status: i.status,
				expiresAt: i.expiresAt ?? null,
			})),
		}
	}
}
