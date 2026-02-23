import {
	ListingDTO,
	PropertyDTO,
	PropertyModuleInterface,
} from '@repo/modules-contracts'
import { ListingRepository } from './application/repositories/listing-repository'
import { PropertyRepository } from './application/repositories/property-repository'
import { UniqueId } from '@repo/core'

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
			response = {
				id: listing.id,
				publicId: listing.publicId,
				pricePerNight: listing.pricePerNight,
				intervals: listing.intervals,
				deletedAt: listing.deletedAt,
			}
		}

		return response
	}
}
