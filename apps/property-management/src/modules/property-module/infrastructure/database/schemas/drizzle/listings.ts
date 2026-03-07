import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { properties } from './properties'

export const listings = pgTable('listings', {
	id: text('id').primaryKey(),
	propertyId: text('property_id')
		.notNull()
		.references(() => properties.id),
	publicId: integer('public_id').notNull().unique(),
	pricePerNightCents: integer('price_per_night_cents').notNull(),
	currency: text('currency').notNull(),
	deletedAt: timestamp('deleted_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true })
		.default(sql`now()`)
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.default(sql`now()`)
		.notNull(),
})

export type ListingDrizzleModel = typeof listings.$inferSelect
export type ListingDrizzleInput = typeof listings.$inferInsert
