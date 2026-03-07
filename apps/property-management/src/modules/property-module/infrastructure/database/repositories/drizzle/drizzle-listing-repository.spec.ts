import {
	UniqueId,
	UUIDV4Generator,
	UUIDV7Generator,
	DefaultIncrementalIdGenerator,
} from '@repo/core'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { appContext } from '@/context/application-context'
import { ListingNotFoundError } from '@/modules/property-module/application/@errors/listing-not-found-error'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { makeListing } from '@/modules/property-module/test/factories/make-listing'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import {
	setupDatabase,
	cleanDatabase,
	closeDatabase,
} from '@/modules/property-module/test/setup-database'
import { Listing } from '@/modules/property-module/domain/models/listing'
import { DrizzleHostRepository } from './drizzle-host-repository'
import { DrizzlePropertyRepository } from './drizzle-property-repository'
import { DrizzleListingRepository } from './drizzle-listing-repository'

const ctx = makeAppContext({
	idGenerator: {
		V4: new UUIDV4Generator(),
		V7: new UUIDV7Generator(),
		Incremental: new DefaultIncrementalIdGenerator(),
	},
})
const hostRepository = new DrizzleHostRepository()
const propertyRepository = new DrizzlePropertyRepository()
const repository = new DrizzleListingRepository()

async function createHostAndProperty() {
	const host = await makeHost()
	await hostRepository.save(host)
	const property = await makeProperty(host.id)
	await propertyRepository.save(property)
	return { host, property }
}

describe('DrizzleListingRepository', () => {
	beforeAll(async () => {
		await setupDatabase()
	})

	afterEach(async () => {
		await cleanDatabase()
	})

	afterAll(async () => {
		await closeDatabase()
	})

	it('should save and find a listing by id', async () => {
		await appContext.run(ctx, async () => {
			const { property } = await createHostAndProperty()
			const listing = await makeListing(property.id)

			await repository.save(listing)
			const found = await repository.findById(listing.id)

			expect(found).not.toBeNull()
			expect(found!.id).toBe(listing.id)
			expect(found!.propertyId).toBe(listing.propertyId)
			expect(found!.publicId).toBe(listing.publicId)
			expect(found!.pricePerNight.valueInCents).toBe(
				listing.pricePerNight.valueInCents
			)
			expect(found!.pricePerNight.currency).toBe(listing.pricePerNight.currency)
			expect(found!.intervals).toHaveLength(listing.intervals.length)
			expect(found!.intervals[0].status).toBe(listing.intervals[0].status)
		})
	})

	it('should save a listing without intervals', async () => {
		await appContext.run(ctx, async () => {
			const { property } = await createHostAndProperty()
			const listing = await Listing.create({
				propertyId: property.id,
				pricePerNight: { valueInCents: 10000, currency: 'BRL' },
				intervals: [],
			})

			await repository.save(listing)
			const found = await repository.findById(listing.id)

			expect(found).not.toBeNull()
			expect(found!.intervals).toHaveLength(0)
		})
	})

	it('should update listing price', async () => {
		await appContext.run(ctx, async () => {
			const { property } = await createHostAndProperty()
			const listing = await makeListing(property.id)
			await repository.save(listing)

			const updated = listing.update({
				pricePerNight: { valueInCents: 99999, currency: 'USD' },
			})
			await repository.update(updated)

			const found = await repository.findById(listing.id)
			expect(found!.pricePerNight.valueInCents).toBe(99999)
			expect(found!.pricePerNight.currency).toBe('USD')
		})
	})

	it('should update listing intervals', async () => {
		await appContext.run(ctx, async () => {
			const { property } = await createHostAndProperty()
			const listing = await makeListing(property.id)
			await repository.save(listing)

			const newInterval = {
				from: new Date('2027-06-01'),
				to: new Date('2027-06-30'),
				status: 'AVAILABLE' as const,
			}
			const updated = listing.update({
				intervals: [...listing.intervals, newInterval],
			})
			await repository.update(updated)

			const found = await repository.findById(listing.id)
			expect(found!.intervals).toHaveLength(2)
		})
	})

	it('should soft delete a listing', async () => {
		await appContext.run(ctx, async () => {
			const { property } = await createHostAndProperty()
			const listing = await makeListing(property.id)
			await repository.save(listing)

			const deleted = listing.delete()
			await repository.delete(deleted)

			const found = await repository.findById(listing.id)
			expect(found).toBeNull()
		})
	})

	it('should return null when listing is not found', async () => {
		await appContext.run(ctx, async () => {
			const found = await repository.findById(UniqueId('non-existent-id'))
			expect(found).toBeNull()
		})
	})

	it('should throw ListingNotFoundError on getById for non-existent listing', async () => {
		await appContext.run(ctx, async () => {
			await expect(
				repository.getById(UniqueId('non-existent-id'))
			).rejects.toThrow(ListingNotFoundError)
		})
	})

	it('should find many listings by host id', async () => {
		await appContext.run(ctx, async () => {
			const { host, property } = await createHostAndProperty()
			const listing1 = await makeListing(property.id)
			const listing2 = await makeListing(property.id)
			await repository.save(listing1)
			await repository.save(listing2)

			const found = await repository.findManyByHostId(host.id)
			expect(found).toHaveLength(2)
		})
	})

	it('should find many listings by property id', async () => {
		await appContext.run(ctx, async () => {
			const { property } = await createHostAndProperty()
			const listing1 = await makeListing(property.id)
			const listing2 = await makeListing(property.id)
			await repository.save(listing1)
			await repository.save(listing2)

			const found = await repository.findManyByPropertyId(property.id)
			expect(found).toHaveLength(2)
		})
	})

	it('should find many listings without filters', async () => {
		await appContext.run(ctx, async () => {
			const { property } = await createHostAndProperty()
			const listing1 = await makeListing(property.id)
			const listing2 = await makeListing(property.id)
			await repository.save(listing1)
			await repository.save(listing2)

			const found = await repository.findMany()
			expect(found.length).toBeGreaterThanOrEqual(2)
		})
	})

	it('should filter listings by price range', async () => {
		await appContext.run(ctx, async () => {
			const { property } = await createHostAndProperty()

			const cheap = await Listing.create({
				propertyId: property.id,
				pricePerNight: { valueInCents: 5000, currency: 'BRL' },
				intervals: [],
			})
			const expensive = await Listing.create({
				propertyId: property.id,
				pricePerNight: { valueInCents: 50000, currency: 'BRL' },
				intervals: [],
			})
			await repository.save(cheap)
			await repository.save(expensive)

			const found = await repository.findMany({
				minPrice: 4000,
				maxPrice: 10000,
			})
			expect(found).toHaveLength(1)
			expect(found[0].pricePerNight.valueInCents).toBe(5000)
		})
	})

	it('should paginate listings', async () => {
		await appContext.run(ctx, async () => {
			const { property } = await createHostAndProperty()

			const listing1 = await makeListing(property.id)
			const listing2 = await makeListing(property.id)
			const listing3 = await makeListing(property.id)
			await repository.save(listing1)
			await repository.save(listing2)
			await repository.save(listing3)

			const found = await repository.findMany(undefined, {
				page: 1,
				limit: 2,
			})
			expect(found).toHaveLength(2)
		})
	})
})
