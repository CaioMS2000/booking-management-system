import { type PropertyType, UniqueId } from '@repo/core'
import { Property } from '@/modules/property-module/domain/models/property'
import type {
	PropertyDrizzleInput,
	PropertyDrizzleModel,
} from '../schemas/drizzle/properties'

export class PropertyMapper {
	static toDomain(row: PropertyDrizzleModel): Property {
		return new Property({
			id: UniqueId(row.id),
			hostId: UniqueId(row.hostId),
			publicId: row.publicId,
			name: row.name,
			description: row.description,
			capacity: row.capacity,
			propertyType: row.propertyType as PropertyType,
			address: {
				street: row.street,
				city: row.city,
				country: row.country,
				state: row.state,
				zipCode: row.zipCode,
			},
			imagesUrls: row.imagesUrls,
			deletedAt: row.deletedAt,
		})
	}

	static toPersistence(property: Property): PropertyDrizzleInput {
		return {
			id: property.id,
			hostId: property.hostId,
			publicId: property.publicId,
			name: property.name,
			description: property.description,
			capacity: property.capacity,
			propertyType: property.type,
			street: property.address.street,
			city: property.address.city,
			country: property.address.country,
			state: property.address.state,
			zipCode: property.address.zipCode,
			imagesUrls: property.imagesUrls,
			deletedAt: property.deletedAt,
		}
	}
}
