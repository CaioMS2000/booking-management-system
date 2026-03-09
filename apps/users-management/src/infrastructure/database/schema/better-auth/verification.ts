import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const authVerifications = pgTable('auth_verifications', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
})

export type AuthVerification = typeof authVerifications.$inferSelect
export type InsertAuthVerification = typeof authVerifications.$inferInsert
