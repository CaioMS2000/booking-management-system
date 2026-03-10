import { sql } from 'drizzle-orm'
import {
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core'

export const users = pgTable(
	'users',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		phone: text('phone').notNull(),
		name: text('name').notNull(),
		email: text('email').notNull(),
		passwordHash: text('password_hash').notNull(),
		role: text('role').notNull().default('GUEST'),
		profession: text('profession'),
		createdAt: timestamp('created_at', { withTimezone: true })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.default(sql`now()`)
			.notNull(),
	},
	table => [uniqueIndex('users_email_idx').on(table.email)]
)

export type User = typeof users.$inferSelect
export type InsertUser = typeof users.$inferInsert
