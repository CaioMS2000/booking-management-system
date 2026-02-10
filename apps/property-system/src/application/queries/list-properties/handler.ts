import { QueryHandler } from '@/application/query'
import { ListPropertiesQuery } from './query'
import { PropertyWithOwnerReadModel } from './read-model'
import { PropertyRepository } from '@/application/repositories/property-repository'
import { OwnerRepository } from '@/application/repositories/owner-repository'
import { Owner } from '@/domain/entities/owner'

export class ListPropertiesQueryHandler extends QueryHandler<ListPropertiesQuery> {
	constructor(
		private propertyRepository: PropertyRepository,
		private ownerRepository: OwnerRepository
	) {
		super()
	}

	async execute(_query: ListPropertiesQuery) {
		const allProperties = await this.propertyRepository.findAll()
		const ownersCache: Map<string, Owner> = new Map()
		const propertiesWithOwner: PropertyWithOwnerReadModel[] = await Promise.all(
			allProperties.map(async property => {
				let owner: Owner
				const cachedOwner = ownersCache.get(property.ownerId.toString())

				if (cachedOwner) {
					owner = cachedOwner
				} else {
					owner = await this.ownerRepository.getById(property.ownerId)
					ownersCache.set(property.ownerId.toString(), owner)
				}

				const propertyWithOwner: PropertyWithOwnerReadModel = {
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
			})
		)

		return propertiesWithOwner
	}
}
