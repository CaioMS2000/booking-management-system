import { UniqueId, Email, Phone } from '@repo/core'
import { and, eq } from 'drizzle-orm'
import { HostRepository } from '@/application/repositories/host-repository'
import { Host } from '@/domain/models/host'
import { BankAccount } from '@/domain/value-object/bank-account'
import { BankCard } from '@/domain/value-object/bank-card'
import {
	bankAccounts,
	bankCards,
	users,
} from '@/infrastructure/database/schema'
import { database } from '@/lib/drizzle'
import { noopIdGenerator } from '@/infrastructure/database/repositories/noop-id-generator'

const ROLE = 'HOST'

export class DrizzleHostRepository extends HostRepository {
	async findById(id: UniqueId): Promise<Host | null> {
		const [row] = await database
			.select()
			.from(users)
			.where(and(eq(users.id, id), eq(users.role, ROLE)))
			.limit(1)

		if (!row) return null

		const email = Email.create(row.email)
		if (email.isFailure()) return null

		const phone = row.phone ? Phone.create(row.phone) : null
		if (!phone || phone.isFailure()) return null

		const [accountRow] = await database
			.select()
			.from(bankAccounts)
			.where(eq(bankAccounts.userId, row.id))
			.limit(1)

		let bankAccount: BankAccount | undefined
		if (accountRow) {
			bankAccount = await BankAccount.create({
				id: UniqueId(accountRow.id),
				idGenerator: noopIdGenerator,
				value: {
					userId: UniqueId(accountRow.userId),
					name: accountRow.name,
					code: accountRow.code,
					agency: accountRow.agency,
					agencyId: accountRow.agencyId,
					accountNumber: accountRow.accountNumber,
					createdAt: accountRow.createdAt,
					updatedAt: accountRow.updatedAt,
				},
			})
		}

		const cardRows = await database
			.select()
			.from(bankCards)
			.where(eq(bankCards.userId, row.id))

		const cards = await Promise.all(
			cardRows.map(c =>
				BankCard.create({
					id: UniqueId(c.id),
					idGenerator: noopIdGenerator,
					value: {
						bankAccountId: c.bankAccountId,
						userId: UniqueId(c.userId),
						cardNumber: c.cardNumber,
						cvv: c.cvv,
						blocked: c.blocked,
						expiresAt: { month: c.expiresMonth, year: c.expiresYear },
						createdAt: c.createdAt,
						updatedAt: c.updatedAt,
					},
				})
			)
		)

		return new Host({
			id: UniqueId(row.id),
			name: row.name,
			email: email.value,
			phone: phone.value,
			bankAccount: bankAccount as any,
			bankCards: cards,
			deletedAt: row.deletedAt ?? null,
		})
	}

	async save(host: Host): Promise<void> {
		await database.insert(users).values({
			id: host.id,
			name: host.name,
			email: host.email.value,
			phone: host.phone.value,
			role: ROLE,
		})

		if (host.bankAccount) {
			const ba = host.bankAccount
			await database.insert(bankAccounts).values({
				id: ba.id,
				userId: host.id,
				name: ba.value.name,
				code: ba.value.code,
				agency: ba.value.agency,
				agencyId: ba.value.agencyId,
				accountNumber: ba.value.accountNumber,
			})
		}
	}

	async update(host: Host): Promise<void> {
		await database
			.update(users)
			.set({
				name: host.name,
				email: host.email.value,
				phone: host.phone.value,
				deletedAt: host.deletedAt,
				updatedAt: new Date(),
			})
			.where(and(eq(users.id, host.id), eq(users.role, ROLE)))
	}

	async delete(host: Host): Promise<void> {
		await database
			.update(users)
			.set({
				deletedAt: host.deletedAt,
				updatedAt: new Date(),
			})
			.where(and(eq(users.id, host.id), eq(users.role, ROLE)))
	}
}
