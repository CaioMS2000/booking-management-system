import { faker } from '@faker-js/faker'
import { UniqueId } from '@repo/core'
import { appContext } from '@/application-context'
import {
	Listing,
	ListingCreateInput,
} from '@/modules/property-module/domain/models/listing'

export async function makeListing(propertyId: UniqueId): Promise<Listing> {
	const context = appContext.get()

	const props: ListingCreateInput = {
		id: await context.idGenerator.V4.generate(),
		propertyId,
		publicId: faker.number.int(),
		pricePerNight: {
			valueInCents: faker.number.int({ min: 5000, max: 50000 }),
			currency: 'BRL',
		},
		intervals: [
			{
				from: faker.date.future(),
				to: faker.date.future({ years: 1 }),
				status: 'AVAILABLE',
			},
		],
	}

	return Listing.create(props)
}
