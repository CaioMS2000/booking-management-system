import {
	DateInterval,
	failure,
	Money,
	Result,
	success,
	UniqueId,
	UseCase,
} from '@repo/core'
import { Listing } from '../../domain/models/listing'
import { PropertyRepository } from '../repositories/property-repository'
import { HostRepository } from '../repositories/host-repository'
import { ListingRepository } from '../repositories/listing-repository'
import { HostNotFoundError, PropertyNotFoundError } from '../@errors'

type CreateListingUseCaseRequest = {
	propertyId: UniqueId
	hostId: UniqueId
	pricePerNight: Money
	intervals?: DateInterval[]
}

type CreateListingUseCaseResponse = Result<
	HostNotFoundError | PropertyNotFoundError,
	{
		listing: Listing
	}
>

type UseCaseProps = {
	hostRepository: HostRepository
	propertyRepository: PropertyRepository
	listingRepository: ListingRepository
}

export class CreateListingUseCase extends UseCase<
	CreateListingUseCaseRequest,
	CreateListingUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: CreateListingUseCaseRequest
	): Promise<CreateListingUseCaseResponse> {
		const host = await this.props.hostRepository.findById(input.hostId)

		if (!host) {
			return failure(HostNotFoundError)
		}

		const property = await this.props.propertyRepository.findById(
			input.propertyId
		)

		if (!property) {
			return failure(PropertyNotFoundError)
		}

		const listing = await Listing.create({
			pricePerNight: input.pricePerNight,
			propertyId: property.id,
			intervals: input.intervals,
		})

		await this.props.listingRepository.save(listing)

		return success({ listing })
	}
}
