import { UniqueId, Email, Phone } from '@repo/core'
import { and, eq } from 'drizzle-orm'
import { AdminRepository } from '@/application/repositories/admin-repository'
import { Admin } from '@/domain/models/admin'
import { users } from '@/infrastructure/database/schema'
import { database } from '@/lib/drizzle'

const ROLE = 'ADMIN'

export class DrizzleAdminRepository extends AdminRepository {
	async findById(id: UniqueId): Promise<Admin | null> {
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

		return new Admin({
			id: UniqueId(row.id),
			name: row.name,
			email: email.value,
			phone: phone.value,
			deletedAt: row.deletedAt ?? null,
		})
	}

	async save(admin: Admin): Promise<void> {
		await database.insert(users).values({
			id: admin.id,
			name: admin.name,
			email: admin.email.value,
			phone: admin.phone.value,
			role: ROLE,
		})
	}

	async update(admin: Admin): Promise<void> {
		await database
			.update(users)
			.set({
				name: admin.name,
				email: admin.email.value,
				phone: admin.phone.value,
				deletedAt: admin.deletedAt,
				updatedAt: new Date(),
			})
			.where(and(eq(users.id, admin.id), eq(users.role, ROLE)))
	}

	async delete(admin: Admin): Promise<void> {
		await database
			.update(users)
			.set({
				deletedAt: admin.deletedAt,
				updatedAt: new Date(),
			})
			.where(and(eq(users.id, admin.id), eq(users.role, ROLE)))
	}
}
