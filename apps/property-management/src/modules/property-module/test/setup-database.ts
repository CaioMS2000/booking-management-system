import { execSync } from 'node:child_process'
import { sql } from 'drizzle-orm'
import { database } from '@/lib/drizzle'
import { listingIntervals } from '../infrastructure/database/schemas/drizzle/listing-intervals'
import { listings } from '../infrastructure/database/schemas/drizzle/listings'
import { properties } from '../infrastructure/database/schemas/drizzle/properties'
import { hosts } from '../infrastructure/database/schemas/drizzle/hosts'

export async function setupDatabase() {
	execSync('npx drizzle-kit push --force', {
		cwd: process.cwd(),
		stdio: 'pipe',
	})
}

export async function cleanDatabase() {
	await database.delete(listingIntervals)
	await database.delete(listings)
	await database.delete(properties)
	await database.delete(hosts)
}

export async function closeDatabase() {
	await database.$client.end()
}
