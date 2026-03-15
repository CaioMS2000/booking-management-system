import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const bankAccounts = pgTable('bank_accounts', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	code: text('code').notNull(),
	agency: text('agency').notNull(),
	agencyId: text('agency_id').notNull(),
	accountNumber: text('account_number').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.default(sql`now()`)
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.default(sql`now()`)
		.notNull(),
})

export type BankAccountRow = typeof bankAccounts.$inferSelect
export type InsertBankAccount = typeof bankAccounts.$inferInsert
