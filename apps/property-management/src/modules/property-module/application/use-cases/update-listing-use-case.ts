import {
	Result,
	failure,
	UseCase,
	UniqueId,
	success,
	Money,
	DateInterval,
} from '@repo/core'
import { Listing } from '../../domain/models/listing'
import {
	HostNotFoundError,
	ListingNotFoundError,
	PropertyNotFoundError,
	ListingNotOwnedByHostError,
} from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { PropertyRepository } from '../repositories/property-repository'
import { ListingRepository } from '../repositories/listing-repository'

export type UpdateListingUseCaseRequest = {
	listingId: string
	hostId: string
	pricePerNight?: Money
	intervals?: DateInterval[]
}

export type UpdateListingUseCaseResponse = Result<
	| HostNotFoundError
	| ListingNotFoundError
	| PropertyNotFoundError
	| ListingNotOwnedByHostError,
	{
		listing: Listing
	}
>

type UseCaseProps = {
	hostRepository: HostRepository
	propertyRepository: PropertyRepository
	listingRepository: ListingRepository
}

export class UpdateListingUseCase extends UseCase<
	UpdateListingUseCaseRequest,
	UpdateListingUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: UpdateListingUseCaseRequest
	): Promise<UpdateListingUseCaseResponse> {
		const host = await this.props.hostRepository.findById(
			UniqueId(input.hostId)
		)

		if (!host) {
			return failure(HostNotFoundError)
		}

		const listing = await this.props.listingRepository.findById(
			UniqueId(input.listingId)
		)

		if (!listing) {
			return failure(ListingNotFoundError)
		}

		const property = await this.props.propertyRepository.findById(
			listing.propertyId
		)

		if (!property) {
			return failure(PropertyNotFoundError)
		}

		if (property.hostId !== UniqueId(input.hostId)) {
			return failure(ListingNotOwnedByHostError)
		}

		const updateFields: Record<string, unknown> = {}
		if (input.pricePerNight !== undefined)
			updateFields.pricePerNight = input.pricePerNight
		if (input.intervals !== undefined) updateFields.intervals = input.intervals

		const updatedListing = listing.update(updateFields)

		await this.props.listingRepository.update(updatedListing)

		return success({ listing: updatedListing })
	}
}
