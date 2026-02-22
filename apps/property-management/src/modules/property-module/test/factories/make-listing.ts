import { faker } from '@faker-js/faker'
import { UniqueId } from '@repo/core'
import {
	Listing,
	ListingCreateInput,
} from '@/modules/property-module/domain/models/listing'

export async function makeListing(propertyId: UniqueId): Promise<Listing> {
	const props: ListingCreateInput = {
		propertyId,
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
