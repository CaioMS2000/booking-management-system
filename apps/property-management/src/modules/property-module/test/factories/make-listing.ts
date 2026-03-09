import { faker } from '@faker-js/faker'
import { IdGenerator, IncrementalIdGenerator, UniqueId } from '@repo/core'
import {
	Listing,
	ListingCreateInput,
} from '@/modules/property-module/domain/models/listing'
import { FakeIdGenerator } from '../fake-id-generator'
import { FakeIncrementalIdGenerator } from '../fake-incremental-id-generator'

type MakeListingParams = {
	propertyId: UniqueId
	idGenerator?: IdGenerator
	incrementalIdGenerator?: IncrementalIdGenerator
}

export async function makeListing({
	propertyId,
	idGenerator,
	incrementalIdGenerator,
}: MakeListingParams): Promise<Listing> {
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

	return Listing.create({
		input: props,
		idGenerator: idGenerator ?? new FakeIdGenerator(),
		incrementalIdGenerator:
			incrementalIdGenerator ?? new FakeIncrementalIdGenerator(),
	})
}
