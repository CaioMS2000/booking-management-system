import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { guests } from './guests'

export const reservations = pgTable('reservations', {
	id: text('id').primaryKey(),
	listingId: text('listing_id').notNull(),
	guestId: text('guest_id')
		.notNull()
		.references(() => guests.id),
	checkIn: timestamp('check_in', { withTimezone: true }).notNull(),
	checkOut: timestamp('check_out', { withTimezone: true }).notNull(),
	status: text('status').notNull(),
	totalPriceCents: integer('total_price_cents').notNull(),
	currency: text('currency').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.default(sql`now()`)
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.default(sql`now()`)
		.notNull(),
})

export type ReservationDrizzleModel = typeof reservations.$inferSelect
export type ReservationDrizzleInput = typeof reservations.$inferInsert
