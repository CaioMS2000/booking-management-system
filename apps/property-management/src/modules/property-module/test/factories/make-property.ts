import { faker } from '@faker-js/faker'
import { PropertyType, UniqueId } from '@repo/core'
import { Property, PropertyCreateInput } from '@/modules/property-module/domain'
import { makeAddress } from './make-address'

export async function makeProperty(hostId: UniqueId): Promise<Property> {
	const propertyType: PropertyType = 'Apartment'
	const numberArray = new Array({
		length: faker.number.int({ min: 1, max: 10 }),
	})
	const imagesUrls = numberArray.map(() => faker.image.urlPicsumPhotos())
	const address = makeAddress()

	const props: PropertyCreateInput = {
		hostId,
		name: faker.location.secondaryAddress(),
		description: faker.location.streetAddress(),
		capacity: faker.number.int({ max: 10 }),
		propertyType,
		address,
		imagesUrls,
	}

	return Property.create(props)
}
