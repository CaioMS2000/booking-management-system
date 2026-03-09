import { sql } from 'drizzle-orm'
import {
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core'
import { authUsers } from './better-auth'

export const users = pgTable(
	'users',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		authUserId: text('auth_user_id')
			.unique()
			.references(() => authUsers.id, { onDelete: 'set null' }),
		phone: text('phone').notNull(),
		name: text('name').notNull(),
		email: text('email'),
		profession: text('profession'),
		createdAt: timestamp('created_at', { withTimezone: true })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.default(sql`now()`)
			.notNull(),
	},
	table => [
		// uniqueIndex('users_tenant_phone_idx').on(table.tenantId, table.phone),
		// uniqueIndex('users_tenant_email_idx').on(table.tenantId, table.email),
	]
)

export type User = typeof users.$inferSelect
export type InsertUser = typeof users.$inferInsert
