import { faker } from '@faker-js/faker'
import { PropertyDTO } from '@repo/modules-contracts'
import { makeAddress } from './make-address'

export function makePropertyDTO(overrides?: Partial<PropertyDTO>): PropertyDTO {
	return {
		id: faker.string.uuid(),
		hostId: faker.string.uuid(),
		publicId: faker.number.int(),
		name: faker.location.secondaryAddress(),
		description: faker.location.streetAddress(),
		capacity: faker.number.int({ max: 10 }),
		propertyType: 'Apartment',
		address: makeAddress(),
		imagesUrls: Array.from(
			{ length: faker.number.int({ min: 1, max: 10 }) },
			() => faker.image.urlPicsumPhotos()
		),
		...overrides,
	}
}
