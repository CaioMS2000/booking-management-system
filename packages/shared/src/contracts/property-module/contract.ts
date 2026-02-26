import { ReservationPeriod } from '@repo/core'
import { ListingDTO, PropertyDTO } from './dto'

export type PlaceHoldResult =
	| { success: true; listing: ListingDTO }
	| {
			success: false
			reason:
				| 'LISTING_NOT_FOUND'
				| 'PERIOD_UNAVAILABLE'
				| 'OUTSIDE_SLIDING_WINDOW'
	  }

export type ConfirmReservationOnListingResult =
	| { success: true; listing: ListingDTO }
	| { success: false; reason: 'LISTING_NOT_FOUND' | 'HOLD_NOT_FOUND' }

export type ReleaseIntervalResult =
	| { success: true; listing: ListingDTO }
	| { success: false; reason: 'LISTING_NOT_FOUND' | 'INTERVAL_NOT_FOUND' }

export abstract class PropertyModuleInterface {
	abstract findProperty(propertyId: string): Promise<PropertyDTO | null>
	abstract propertyExists(propertyId: string): Promise<boolean>
	abstract findListing(listingId: string): Promise<ListingDTO | null>

	abstract placeHold(
		listingId: string,
		period: ReservationPeriod,
		holdDurationMinutes?: number
	): Promise<PlaceHoldResult>

	abstract confirmReservationOnListing(
		listingId: string,
		period: ReservationPeriod
	): Promise<ConfirmReservationOnListingResult>

	abstract releaseInterval(
		listingId: string,
		period: ReservationPeriod
	): Promise<ReleaseIntervalResult>
}
