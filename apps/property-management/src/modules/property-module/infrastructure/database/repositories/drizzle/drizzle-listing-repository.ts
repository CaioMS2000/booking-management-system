import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm'
import { type UniqueId, IdGenerator } from '@repo/core'
import { database } from '@/lib/drizzle'
import {
	ListingRepository,
	type ListingFilters,
} from '@/modules/property-module/application/repositories/listing-repository'
import type { Pagination } from '@/modules/property-module/application/repositories/params'
import { ListingNotFoundError } from '@/modules/property-module/application/@errors/listing-not-found-error'
import { PeriodNotAvailableError } from '@/modules/property-module/application/@errors/perio-not-available-error'
import type { Listing } from '@/modules/property-module/domain/models/listing'
import { listings } from '../../schemas/drizzle/listings'
import { listingIntervals } from '../../schemas/drizzle/listing-intervals'
import { properties } from '../../schemas/drizzle/properties'
import { ListingMapper } from '../../mappers/listing-mapper'

export class DrizzleListingRepository extends ListingRepository {
	constructor(private readonly idGeneratorV4: IdGenerator) {
		super()
	}

	async save(listing: Listing): Promise<void> {
		const data = ListingMapper.toPersistence(listing)

		await database.transaction(async tx => {
			await tx.insert(listings).values(data.listing)

			if (data.intervals.length > 0) {
				const intervalValues = await Promise.all(
					data.intervals.map(async i => ({
						...i,
						id: await this.idGeneratorV4.generate(),
					}))
				)
				await tx.insert(listingIntervals).values(intervalValues)
			}
		})
	}

	async update(listing: Listing): Promise<void> {
		const data = ListingMapper.toPersistence(listing)

		try {
			await database.transaction(async tx => {
				await tx
					.update(listings)
					.set(data.listing)
					.where(eq(listings.id, listing.id))

				await tx
					.delete(listingIntervals)
					.where(eq(listingIntervals.listingId, listing.id))

				if (data.intervals.length > 0) {
					const intervalValues = await Promise.all(
						data.intervals.map(async i => ({
							...i,
							id: await this.idGeneratorV4.generate(),
						}))
					)
					await tx.insert(listingIntervals).values(intervalValues)
				}
			})
		} catch (error: unknown) {
			if (
				error instanceof Error &&
				'code' in error &&
				(error as any).code === '23P01'
			) {
				throw new PeriodNotAvailableError()
			}
			throw error
		}
	}

	async delete(listing: Listing): Promise<void> {
		await database
			.update(listings)
			.set({ deletedAt: listing.deletedAt })
			.where(eq(listings.id, listing.id))
	}

	async findById(id: UniqueId): Promise<Listing | null> {
		const [row] = await database
			.select()
			.from(listings)
			.where(and(eq(listings.id, id), isNull(listings.deletedAt)))
			.limit(1)

		if (!row) return null

		const intervalRows = await database
			.select()
			.from(listingIntervals)
			.where(eq(listingIntervals.listingId, id))

		return ListingMapper.toDomain(row, intervalRows)
	}

	async getById(id: UniqueId): Promise<Listing> {
		const listing = await this.findById(id)
		if (!listing) throw new ListingNotFoundError(`Listing not found: ${id}`)
		return listing
	}

	async findManyByHostId(hostId: UniqueId): Promise<Listing[]> {
		const rows = await database
			.select({ listing: listings })
			.from(listings)
			.innerJoin(properties, eq(listings.propertyId, properties.id))
			.where(and(eq(properties.hostId, hostId), isNull(listings.deletedAt)))

		return this.hydrateListings(rows.map(r => r.listing))
	}

	async findManyByPropertyId(propertyId: UniqueId): Promise<Listing[]> {
		const rows = await database
			.select()
			.from(listings)
			.where(
				and(eq(listings.propertyId, propertyId), isNull(listings.deletedAt))
			)

		return this.hydrateListings(rows)
	}

	async findMany(
		filters?: ListingFilters,
		pagination?: Pagination
	): Promise<Listing[]> {
		const conditions = [isNull(listings.deletedAt)]

		if (filters?.minPrice !== undefined) {
			conditions.push(gte(listings.pricePerNightCents, filters.minPrice))
		}
		if (filters?.maxPrice !== undefined) {
			conditions.push(lte(listings.pricePerNightCents, filters.maxPrice))
		}
		if (filters?.currency) {
			conditions.push(eq(listings.currency, filters.currency))
		}
		if (filters?.capacity !== undefined) {
			conditions.push(gte(properties.capacity, filters.capacity))
		}

		const page = pagination?.page ?? 1
		const limit = pagination?.limit ?? 20

		const needsJoin = filters?.capacity !== undefined

		const baseQuery = needsJoin
			? database
					.select({ listing: listings })
					.from(listings)
					.innerJoin(properties, eq(listings.propertyId, properties.id))
			: database.select({ listing: listings }).from(listings)

		const rows = await baseQuery
			.where(and(...conditions))
			.limit(limit)
			.offset((page - 1) * limit)

		return this.hydrateListings(rows.map(r => r.listing))
	}

	private async hydrateListings(
		rows: (typeof listings.$inferSelect)[]
	): Promise<Listing[]> {
		if (rows.length === 0) return []

		const listingIds = rows.map(r => r.id)

		const allIntervals = await database
			.select()
			.from(listingIntervals)
			.where(
				sql`${listingIntervals.listingId} IN (${sql.join(
					listingIds.map(id => sql`${id}`),
					sql`, `
				)})`
			)

		const intervalsByListingId = new Map<
			string,
			(typeof listingIntervals.$inferSelect)[]
		>()
		for (const interval of allIntervals) {
			const existing = intervalsByListingId.get(interval.listingId) ?? []
			existing.push(interval)
			intervalsByListingId.set(interval.listingId, existing)
		}

		return rows.map(row =>
			ListingMapper.toDomain(row, intervalsByListingId.get(row.id) ?? [])
		)
	}
}
