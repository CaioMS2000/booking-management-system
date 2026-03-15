import { sql } from 'drizzle-orm'
import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core'
import { bankAccounts } from './bank-accounts'
import { users } from './users'

export const bankCards = pgTable('bank_cards', {
	id: uuid('id').defaultRandom().primaryKey(),
	bankAccountId: uuid('bank_account_id')
		.notNull()
		.references(() => bankAccounts.id, { onDelete: 'cascade' }),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	cardNumber: text('card_number').notNull(),
	cvv: text('cvv').notNull(),
	blocked: boolean('blocked').notNull().default(false),
	expiresMonth: integer('expires_month').notNull(),
	expiresYear: integer('expires_year').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.default(sql`now()`)
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.default(sql`now()`)
		.notNull(),
})

export type BankCardRow = typeof bankCards.$inferSelect
export type InsertBankCard = typeof bankCards.$inferInsert
