import { Host } from '@/modules/property-module/domain/entities/host'
import { QueryHandler } from '@/modules/property-module/application/query'
import { HostRepository } from '@/modules/property-module/application/repositories/host-repository'
import { PropertyRepository } from '@/modules/property-module/application/repositories/property-repository'
import { ListPropertiesQuery } from './query'
import { PropertyWithHostReadModel } from './read-model'

export class ListPropertiesQueryHandler extends QueryHandler<ListPropertiesQuery> {
	constructor(
		private propertyRepository: PropertyRepository,
		private hostRepository: HostRepository
	) {
		super()
	}

	async execute(_query: ListPropertiesQuery) {
		const allProperties = await this.propertyRepository.findAll()
		const hostsCache: Map<string, Host> = new Map()
		const propertiesWithHost: PropertyWithHostReadModel[] = await Promise.all(
			allProperties.map(async property => {
				let host: Host
				const cachedHost = hostsCache.get(property.hostId.toString())

				if (cachedHost) {
					host = cachedHost
				} else {
					host = await this.hostRepository.getById(property.hostId)
					hostsCache.set(property.hostId.toString(), host)
				}

				const propertyWithHost: PropertyWithHostReadModel = {
					name: property.name,
					description: property.description,
					capacity: property.capacity,
					pricePerNight: property.pricePerNight,
					propertyType: property.type,
					address: property.address,
					status: property.status,
					imagesUrls: property.imagesUrls,
					host: {
						name: host.name,
						email: host.email,
						phone: host.phone,
					},
				}

				return propertyWithHost
			})
		)

		return propertiesWithHost
	}
}
