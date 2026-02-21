import { Result, failure, UseCase, UniqueId, success } from '@repo/core'
import { Listing } from '../../domain/models/listing'
import { ListingNotFoundError } from '../@errors'
import { ListingRepository } from '../repositories/listing-repository'

export type GetListingUseCaseRequest = {
	listingId: string
}

export type GetListingUseCaseResponse = Result<
	ListingNotFoundError,
	{
		listing: Listing
	}
>

type UseCaseProps = {
	listingRepository: ListingRepository
}

export class GetListingUseCase extends UseCase<
	GetListingUseCaseRequest,
	GetListingUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: GetListingUseCaseRequest
	): Promise<GetListingUseCaseResponse> {
		const listing = await this.props.listingRepository.findById(
			UniqueId(input.listingId)
		)

		if (!listing) {
			return failure(ListingNotFoundError)
		}

		return success({ listing })
	}
}
