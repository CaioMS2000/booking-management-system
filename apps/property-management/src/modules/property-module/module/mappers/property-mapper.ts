import { PropertyDTO } from '@repo/modules-contracts'
import { Address, Property } from '../../domain'
import { PropertyReadModel } from '../../application/queries/get-property/read-model'
import { UniqueEntityID } from '@repo/core'

export class PropertyMapper {
	static entityToDTO(property: Property): PropertyDTO {
		return {
			id: property.id.toString(),
			hostId: property.hostId.toString(),
			publicId: property.publicId,
			name: property.name,
			description: property.description,
			capacity: property.capacity,
			imagesUrls: property.imagesUrls,
			propertyType: property.type,
			address: {
				street: property.address.street,
				city: property.address.city,
				country: property.address.country,
				state: property.address.state,
				zipCode: property.address.zipCode,
			},
		}
	}

	static queryModelToEntity(queryModel: PropertyReadModel): Property {
		const address = queryModel.address
		return Property.create({
			address,
			capacity: queryModel.capacity,
			description: queryModel.description,
			hostId: new UniqueEntityID(queryModel.host.id),
			imagesUrls: queryModel.imagesUrls,
			name: queryModel.name,
			publicId: queryModel.publicId,
			propertyType: queryModel.propertyType,
			id: new UniqueEntityID(queryModel.id),
		})
	}
}
