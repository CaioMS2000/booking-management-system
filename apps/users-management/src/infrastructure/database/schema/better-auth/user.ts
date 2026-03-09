import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const authUsers = pgTable('auth_users', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	phone: text('phone').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
})

export type AuthUser = typeof authUsers.$inferSelect
export type InsertAuthUser = typeof authUsers.$inferInsert
