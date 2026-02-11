import { faker } from '@faker-js/faker'
import { UniqueEntityID } from '@repo/core'
import { Currency, Money, PropertyType } from '@/modules/property-module/domain'
import { Property, PropertyCreateInput } from '@/modules/property-module/domain'
import { appContext } from '@/modules/property-module/application-context'
import { makeAddress } from './make-address'
import { makeMoney } from './make-money'

export async function makeProperty(hostId: UniqueEntityID): Promise<Property> {
	let pricePerNight: Money | undefined
	const random = faker.number.int({
		min: Number.MIN_SAFE_INTEGER,
		max: Number.MAX_SAFE_INTEGER,
	})
	const currency = Currency[random % Currency.length]
	const isEven = random % 2 === 0
	const propertyType: PropertyType = 'Apartment'
	let status: 'active' | 'inactive' = 'inactive'
	const numberArray = new Array({
		length: faker.number.int({ min: 1, max: 10 }),
	})
	const imagesUrls = numberArray.map(() => faker.image.urlPicsumPhotos())
	const address = makeAddress()
	const context = appContext.get()

	if (isEven) {
		pricePerNight = makeMoney(currency)
		status = 'active'
	}

	const props: PropertyCreateInput = {
		id: await context.idGenerator.V4.generate(),
		hostId,
		name: faker.location.secondaryAddress(),
		description: faker.location.streetAddress(),
		capacity: faker.number.int({ max: 10 }),
		pricePerNight,
		propertyType,
		address,
		status,
		publicId: faker.number.int(),
		imagesUrls,
	}

	return Property.create(props)
}
