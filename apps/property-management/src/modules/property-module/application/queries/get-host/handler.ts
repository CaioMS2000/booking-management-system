import { failure, success } from '@repo/core'
import { HostNotFoundError } from '@/modules/property-module/application/@errors'
import { QueryHandler } from '@/modules/property-module/application/query'
import { HostRepository } from '@/modules/property-module/application/repositories/host-repository'
import { PropertyRepository } from '@/modules/property-module/application/repositories/property-repository'
import { GetHostQuery } from './query'
import { HostReadModel } from './read-model'

export class GetHostQueryHandler extends QueryHandler<GetHostQuery> {
	constructor(
		private propertyRepository: PropertyRepository,
		private hostRepository: HostRepository
	) {
		super()
	}

	async execute(query: GetHostQuery) {
		const host = await this.hostRepository.findById(query.hostId)

		if (!host) {
			return failure(new HostNotFoundError(`Host ${query.hostId} not found`))
		}

		const properties = await this.propertyRepository.findManyByHostId(host.id)

		const hostReadModel: HostReadModel = {
			name: host.name,
			email: host.email,
			phone: host.phone,
			propertiesIds: properties.map(property => property.id),
		}

		return success(hostReadModel)
	}
}
