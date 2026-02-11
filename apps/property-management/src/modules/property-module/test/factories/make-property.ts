import { faker } from '@faker-js/faker'
import { UniqueEntityID } from '@repo/core'
import { appContext } from '@/application-context'
import {
	Property,
	PropertyCreateInput,
	PropertyType,
} from '@/modules/property-module/domain'
import { makeAddress } from './make-address'

export async function makeProperty(hostId: UniqueEntityID): Promise<Property> {
	const propertyType: PropertyType = 'Apartment'
	const numberArray = new Array({
		length: faker.number.int({ min: 1, max: 10 }),
	})
	const imagesUrls = numberArray.map(() => faker.image.urlPicsumPhotos())
	const address = makeAddress()
	const context = appContext.get()

	const props: PropertyCreateInput = {
		id: await context.idGenerator.V4.generate(),
		hostId,
		name: faker.location.secondaryAddress(),
		description: faker.location.streetAddress(),
		capacity: faker.number.int({ max: 10 }),
		propertyType,
		address,
		publicId: faker.number.int(),
		imagesUrls,
	}

	return Property.create(props)
}
