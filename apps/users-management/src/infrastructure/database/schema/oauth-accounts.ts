import { sql } from 'drizzle-orm'
import {
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const oauthAccounts = pgTable(
	'oauth_accounts',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		provider: text('provider').notNull(),
		providerAccountId: text('provider_account_id').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.default(sql`now()`)
			.notNull(),
	},
	table => [
		uniqueIndex('oauth_accounts_provider_account_idx').on(
			table.provider,
			table.providerAccountId
		),
	]
)
