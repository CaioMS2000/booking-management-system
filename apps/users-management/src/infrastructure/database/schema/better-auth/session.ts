import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { authUsers } from './user'

export const authSessions = pgTable('auth_sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => authUsers.id, { onDelete: 'cascade' }),
	token: text('token').notNull().unique(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
})

export type AuthSession = typeof authSessions.$inferSelect
export type InsertAuthSession = typeof authSessions.$inferInsert
