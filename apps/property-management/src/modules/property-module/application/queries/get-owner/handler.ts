import { failure, success } from '@repo/core'
import { OwnerNotFoundError } from '@/modules/property-module/application/@errors'
import { QueryHandler } from '@/modules/property-module/application/query'
import { OwnerRepository } from '@/modules/property-module/application/repositories/owner-repository'
import { PropertyRepository } from '@/modules/property-module/application/repositories/property-repository'
import { GetOwnerQuery } from './query'
import { OwnerReadModel } from './read-model'

export class GetOwnerQueryHandler extends QueryHandler<GetOwnerQuery> {
	constructor(
		private propertyRepository: PropertyRepository,
		private ownerRepository: OwnerRepository
	) {
		super()
	}

	async execute(query: GetOwnerQuery) {
		const owner = await this.ownerRepository.findById(query.ownerId)

		if (!owner) {
			return failure(new OwnerNotFoundError(`Owner ${query.ownerId} not found`))
		}

		const properties = await this.propertyRepository.findManyByOwnerId(owner.id)

		const ownerReadModel: OwnerReadModel = {
			name: owner.name,
			email: owner.email,
			phone: owner.phone,
			propertiesIds: properties.map(property => property.id),
		}

		return success(ownerReadModel)
	}
}
