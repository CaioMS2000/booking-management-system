import { Result, failure, UseCase, UniqueId, success } from '@repo/core'
import {
	HostNotFoundError,
	ListingNotFoundError,
	PropertyNotFoundError,
	ListingNotOwnedByHostError,
} from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { PropertyRepository } from '../repositories/property-repository'
import { ListingRepository } from '../repositories/listing-repository'

export type DeleteListingUseCaseRequest = {
	listingId: string
	hostId: string
}

export type DeleteListingUseCaseResponse = Result<
	| HostNotFoundError
	| ListingNotFoundError
	| PropertyNotFoundError
	| ListingNotOwnedByHostError,
	null
>

type UseCaseProps = {
	hostRepository: HostRepository
	propertyRepository: PropertyRepository
	listingRepository: ListingRepository
}

export class DeleteListingUseCase extends UseCase<
	DeleteListingUseCaseRequest,
	DeleteListingUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: DeleteListingUseCaseRequest
	): Promise<DeleteListingUseCaseResponse> {
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

		const deletedListing = listing.delete()

		await this.props.listingRepository.delete(deletedListing)

		return success(null)
	}
}
