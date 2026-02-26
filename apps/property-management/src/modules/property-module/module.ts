import { ReservationPeriod, UniqueId } from '@repo/core'
import {
	ConfirmReservationOnListingResult,
	ListingDTO,
	PlaceHoldResult,
	PropertyDTO,
	PropertyModuleInterface,
	ReleaseIntervalResult,
} from '@repo/modules-contracts'
import { ListingRepository } from './application/repositories/listing-repository'
import { PropertyRepository } from './application/repositories/property-repository'
import { Listing } from './domain/models/listing'
import { IntervalWithinSlidingWindowRule } from './domain/rules/interval-within-sliding-window-rule'

const DEFAULT_HOLD_DURATION_MINUTES = 15

type ModuleProps = {
	propertyRepository: PropertyRepository
	listingRepository: ListingRepository
}

export class PropertyModule extends PropertyModuleInterface {
	constructor(protected props: ModuleProps) {
		super()
	}

	async findProperty(propertyId: string): Promise<PropertyDTO | null> {
		let response: PropertyDTO | null = null
		const property = await this.props.propertyRepository.findById(
			UniqueId(propertyId)
		)

		if (property) {
			response = {
				id: property.id,
				hostId: property.hostId,
				publicId: property.publicId,
				name: property.name,
				description: property.description,
				capacity: property.capacity,
				propertyType: property.type,
				address: property.address,
				imagesUrls: property.imagesUrls,
			}
		}

		return response
	}

	propertyExists(propertyId: string): Promise<boolean> {
		return this.findProperty(propertyId).then(property => !!property)
	}

	async findListing(listingId: string): Promise<ListingDTO | null> {
		let response: ListingDTO | null = null
		const listing = await this.props.listingRepository.findById(
			UniqueId(listingId)
		)

		if (listing) {
			response = this.toListingDTO(listing)
		}

		return response
	}

	async placeHold(
		listingId: string,
		period: ReservationPeriod,
		holdDurationMinutes: number = DEFAULT_HOLD_DURATION_MINUTES
	): Promise<PlaceHoldResult> {
		const listing = await this.props.listingRepository.findById(
			UniqueId(listingId)
		)

		if (!listing) {
			return { success: false, reason: 'LISTING_NOT_FOUND' }
		}

		const now = new Date()

		const slidingWindowRule = new IntervalWithinSlidingWindowRule()
		if (!slidingWindowRule.validate({ from: period.from, now })) {
			return { success: false, reason: 'OUTSIDE_SLIDING_WINDOW' }
		}

		const expiresAt = new Date(now.getTime() + holdDurationMinutes * 60 * 1000)

		const cleaned = listing.cleanupExpiredHolds(now)
		const result = cleaned.placeHold(period, expiresAt, now)

		if (result.isFailure()) {
			return { success: false, reason: 'PERIOD_UNAVAILABLE' }
		}

		await this.props.listingRepository.update(result.value)

		return { success: true, listing: this.toListingDTO(result.value) }
	}

	async confirmReservationOnListing(
		listingId: string,
		period: ReservationPeriod
	): Promise<ConfirmReservationOnListingResult> {
		const listing = await this.props.listingRepository.findById(
			UniqueId(listingId)
		)

		if (!listing) {
			return { success: false, reason: 'LISTING_NOT_FOUND' }
		}

		const result = listing.confirmReservation(period)

		if (result.isFailure()) {
			return { success: false, reason: 'HOLD_NOT_FOUND' }
		}

		await this.props.listingRepository.update(result.value)

		return { success: true, listing: this.toListingDTO(result.value) }
	}

	async releaseInterval(
		listingId: string,
		period: ReservationPeriod
	): Promise<ReleaseIntervalResult> {
		const listing = await this.props.listingRepository.findById(
			UniqueId(listingId)
		)

		if (!listing) {
			return { success: false, reason: 'LISTING_NOT_FOUND' }
		}

		const result = listing.releaseInterval(period)

		if (result.isFailure()) {
			return { success: false, reason: 'INTERVAL_NOT_FOUND' }
		}

		await this.props.listingRepository.update(result.value)

		return { success: true, listing: this.toListingDTO(result.value) }
	}

	private toListingDTO(listing: Listing): ListingDTO {
		return {
			id: listing.id,
			publicId: listing.publicId,
			pricePerNight: listing.pricePerNight,
			intervals: listing.intervals,
			deletedAt: listing.deletedAt,
		}
	}
}
