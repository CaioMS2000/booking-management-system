import { Result, failure, UseCase, UniqueId, success } from '@repo/core'
import {
	HostNotFoundError,
	PropertyNotFoundError,
	PropertyNotOwnedByHostError,
	PropertyHasActiveListingsError,
} from '../@errors'
import type { Property } from '../../domain/models/property'
import { HostRepository } from '../repositories/host-repository'
import { PropertyRepository } from '../repositories/property-repository'
import { ListingRepository } from '../repositories/listing-repository'

export type DeletePropertyUseCaseRequest = {
	propertyId: string
	hostId: string
}

export type DeletePropertyUseCaseResponse = Result<
	| HostNotFoundError
	| PropertyNotFoundError
	| PropertyNotOwnedByHostError
	| PropertyHasActiveListingsError,
	Property
>

type UseCaseProps = {
	hostRepository: HostRepository
	propertyRepository: PropertyRepository
	listingRepository: ListingRepository
}

export class DeletePropertyUseCase extends UseCase<
	DeletePropertyUseCaseRequest,
	DeletePropertyUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: DeletePropertyUseCaseRequest
	): Promise<DeletePropertyUseCaseResponse> {
		const host = await this.props.hostRepository.findById(
			UniqueId(input.hostId)
		)

		if (!host) {
			return failure(HostNotFoundError)
		}

		const property = await this.props.propertyRepository.findById(
			UniqueId(input.propertyId)
		)

		if (!property) {
			return failure(PropertyNotFoundError)
		}

		if (property.hostId !== UniqueId(input.hostId)) {
			return failure(PropertyNotOwnedByHostError)
		}

		const listings = await this.props.listingRepository.findManyByPropertyId(
			property.id
		)

		const hasActiveListings = listings.some(listing => !listing.isDeleted)

		if (hasActiveListings) {
			return failure(PropertyHasActiveListingsError)
		}

		const deletedProperty = property.delete()

		await this.props.propertyRepository.delete(deletedProperty)

		return success(deletedProperty)
	}
}
