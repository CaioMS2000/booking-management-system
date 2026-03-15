import { UniqueId, Email, Phone } from '@repo/core'
import { and, eq } from 'drizzle-orm'
import { GuestRepository } from '@/application/repositories/guest-repository'
import { Guest } from '@/domain/models/guest'
import { BankCard } from '@/domain/value-object/bank-card'
import { bankCards, users } from '@/infrastructure/database/schema'
import { database } from '@/lib/drizzle'
import { noopIdGenerator } from '@/infrastructure/database/repositories/noop-id-generator'

const ROLE = 'GUEST'

export class DrizzleGuestRepository extends GuestRepository {
	async findById(id: UniqueId): Promise<Guest | null> {
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

		return new Guest({
			id: UniqueId(row.id),
			name: row.name,
			email: email.value,
			phone: phone.value,
			bankCards: cards,
			deletedAt: row.deletedAt ?? null,
		})
	}

	async save(guest: Guest): Promise<void> {
		await database.insert(users).values({
			id: guest.id,
			name: guest.name,
			email: guest.email.value,
			phone: guest.phone.value,
			role: ROLE,
		})
	}

	async update(guest: Guest): Promise<void> {
		await database
			.update(users)
			.set({
				name: guest.name,
				email: guest.email.value,
				phone: guest.phone.value,
				deletedAt: guest.deletedAt,
				updatedAt: new Date(),
			})
			.where(and(eq(users.id, guest.id), eq(users.role, ROLE)))
	}

	async delete(guest: Guest): Promise<void> {
		await database
			.update(users)
			.set({
				deletedAt: guest.deletedAt,
				updatedAt: new Date(),
			})
			.where(and(eq(users.id, guest.id), eq(users.role, ROLE)))
	}
}
