import { faker } from '@faker-js/faker'
import { UniqueId } from '@repo/core'
import {
	Listing,
	ListingCreateInput,
} from '@/modules/property-module/domain/models/listing'

export async function makeListing(propertyId: UniqueId): Promise<Listing> {
	const from = faker.date.future()
	const to = faker.date.future({ refDate: from })

	const props: ListingCreateInput = {
		propertyId,
		pricePerNight: {
			valueInCents: faker.number.int({ min: 5000, max: 50000 }),
			currency: 'BRL',
		},
		intervals: [
			{
				from,
				to,
				status: 'AVAILABLE',
			},
		],
	}

	return Listing.create(props)
}
