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
		phone: text('phone'),
		name: text('name').notNull(),
		email: text('email').notNull(),
		passwordHash: text('password_hash'),
		role: text('role').notNull().default('GUEST'),
		profession: text('profession'),
		createdAt: timestamp('created_at', { withTimezone: true })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.default(sql`now()`)
			.notNull(),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
	},
	table => [uniqueIndex('users_email_idx').on(table.email)]
)

export type User = typeof users.$inferSelect
export type InsertUser = typeof users.$inferInsert
