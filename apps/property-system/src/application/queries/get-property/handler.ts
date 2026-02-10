import { QueryHandler } from '@/application/query'
import { OwnerRepository } from '@/application/repositories/owner-repository'
import { PropertyRepository } from '@/application/repositories/property-repository'
import { Owner } from '@/domain/entities/owner'
import { GetPropertyQuery } from './query'
import { NullablePropertyReadModel } from './read-model'
import { createLogger } from '@/logging/logger'

const logger = createLogger({ component: 'GetPropertyQueryHandler' })
export class GetPropertyQueryHandler extends QueryHandler<GetPropertyQuery> {
	constructor(
		private propertyRepository: PropertyRepository,
		private ownerRepository: OwnerRepository
	) {
		super()
	}

	async execute(query: GetPropertyQuery) {
		try {
			const property = await this.propertyRepository.get(query.propertyId)
			const owner: Owner = await this.ownerRepository.get(property.ownerId)
			const propertyWithOwner: NullablePropertyReadModel = {
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

			return propertyWithOwner
		} catch (error) {
			logger.error(JSON.stringify(error, null, 2))
			return null
		}
	}
}
