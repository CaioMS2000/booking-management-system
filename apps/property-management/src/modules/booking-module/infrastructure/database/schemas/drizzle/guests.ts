import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const guests = pgTable('guests', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull(),
	phone: text('phone').notNull(),
	deletedAt: timestamp('deleted_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true })
		.default(sql`now()`)
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.default(sql`now()`)
		.notNull(),
})

export type GuestDrizzleModel = typeof guests.$inferSelect
export type GuestDrizzleInput = typeof guests.$inferInsert
