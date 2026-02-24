import { Result, UseCase, success } from '@repo/core'
import { Listing } from '../../domain/models/listing'
import {
	ListingRepository,
	ListingFilters,
} from '../repositories/listing-repository'
import { Pagination } from '../repositories/params'

export type GetAllListingsUseCaseRequest = {
	filters?: ListingFilters
	page?: number
	limit?: number
}

export type GetAllListingsUseCaseResponse = Result<
	never,
	{
		listings: Listing[]
	}
>

type UseCaseProps = {
	listingRepository: ListingRepository
}

export class GetAllListingsUseCase extends UseCase<
	GetAllListingsUseCaseRequest,
	GetAllListingsUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: GetAllListingsUseCaseRequest
	): Promise<GetAllListingsUseCaseResponse> {
		const pagination: Pagination = {
			page: input.page ?? 1,
			limit: input.limit ?? 20,
		}

		const listings = await this.props.listingRepository.findMany(
			input.filters,
			pagination
		)

		return success({ listings })
	}
}
