import { Command, CommandHandler } from '@/application/command'
import { ListPropertiesCommand, PropertyWithOwner } from './command'
import { PropertyRepository } from '@/application/repositories/property-repository'
import { OwnerRepository } from '@/application/repositories/owner-repository'
import { Owner } from '@/domain/entities/owner'

export class ListPropertiesCommandHandler extends CommandHandler {
	constructor(
		private propertyRepository: PropertyRepository,
		private ownerRepository: OwnerRepository
	) {
		super()
	}

	async execute(_command: ListPropertiesCommand) {
		const allProperties = await this.propertyRepository.getAll()
		const ownersCache: Map<string, Owner> = new Map()
		const propertiesWithOwner: PropertyWithOwner[] = await Promise.all(
			allProperties.map(async property => {
				let owner: Owner
				const cachedOwner = ownersCache.get(property.ownerId.toString())

				if (cachedOwner) {
					owner = cachedOwner
				} else {
					owner = await this.ownerRepository.get(property.ownerId)
					ownersCache.set(property.ownerId.toString(), owner)
				}

				const propertyWithOwner: PropertyWithOwner = {
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
