import { database } from '@/lib/drizzle'
import { reservations } from '../infrastructure/database/schemas/drizzle/reservations'
import { guests } from '../infrastructure/database/schemas/drizzle/guests'
import { listingIntervals } from '@/modules/property-module/infrastructure/database/schemas/drizzle/listing-intervals'
import { listings } from '@/modules/property-module/infrastructure/database/schemas/drizzle/listings'
import { properties } from '@/modules/property-module/infrastructure/database/schemas/drizzle/properties'
import { hosts } from '@/modules/property-module/infrastructure/database/schemas/drizzle/hosts'

export async function cleanDatabase() {
	await database.delete(reservations)
	await database.delete(guests)
	await database.delete(listingIntervals)
	await database.delete(listings)
	await database.delete(properties)
	await database.delete(hosts)
}

export async function closeDatabase() {
	await database.$client.end()
}
