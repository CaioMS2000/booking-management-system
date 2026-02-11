import { failure, success } from '@repo/core'
import { PropertyNotFoundError } from '@/modules/property-module/application/@errors'
import { QueryHandler } from '@/modules/property-module/application/query'
import { OwnerRepository } from '@/modules/property-module/application/repositories/owner-repository'
import { PropertyRepository } from '@/modules/property-module/application/repositories/property-repository'
import { GetPropertyQuery } from './query'
import { PropertyReadModel } from './read-model'

export class GetPropertyQueryHandler extends QueryHandler<GetPropertyQuery> {
	constructor(
		private propertyRepository: PropertyRepository,
		private ownerRepository: OwnerRepository
	) {
		super()
	}

	async execute(query: GetPropertyQuery) {
		const property = await this.propertyRepository.findById(query.propertyId)

		if (!property) {
			return failure(
				new PropertyNotFoundError(`Property ${query.propertyId} not found`)
			)
		}

		const owner = await this.ownerRepository.getById(property.ownerId)

		const propertyWithOwner: PropertyReadModel = {
			name: property.name,
			description: property.description,
			capacity: property.capacity,
			pricePerNight: property.pricePerNight,
			propertyType: property.type,
			address: property.address,
			status: property.status,
			imagesUrls: property.imagesUrls,
			owner: {
				name: owner.name,
				email: owner.email,
				phone: owner.phone,
			},
		}

		return success(propertyWithOwner)
	}
}
