import { failure, success } from '@repo/core'
import { PropertyNotFoundError } from '@/modules/property-module/application/@errors'
import { QueryHandler } from '@/modules/property-module/application/query'
import { HostRepository } from '@/modules/property-module/application/repositories/host-repository'
import { PropertyRepository } from '@/modules/property-module/application/repositories/property-repository'
import { GetPropertyQuery } from './query'
import { PropertyReadModel } from './read-model'

export class GetPropertyQueryHandler extends QueryHandler<GetPropertyQuery> {
	constructor(
		private propertyRepository: PropertyRepository,
		private hostRepository: HostRepository
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

		const host = await this.hostRepository.getById(property.hostId)

		const propertyWithHost: PropertyReadModel = {
			name: property.name,
			description: property.description,
			capacity: property.capacity,
			propertyType: property.type,
			address: property.address,
			imagesUrls: property.imagesUrls,
			host: {
				name: host.name,
				email: host.email,
				phone: host.phone,
			},
		}

		return success(propertyWithHost)
	}
}
