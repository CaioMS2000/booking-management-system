import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { listings } from './listings'

export const listingIntervals = pgTable('listing_intervals', {
	id: text('id').primaryKey(),
	listingId: text('listing_id')
		.notNull()
		.references(() => listings.id),
	from: timestamp('from', { withTimezone: true }).notNull(),
	to: timestamp('to', { withTimezone: true }).notNull(),
	status: text('status').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }),
})

export type ListingIntervalDrizzleModel = typeof listingIntervals.$inferSelect
export type ListingIntervalDrizzleInput = typeof listingIntervals.$inferInsert
