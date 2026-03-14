import { eq } from 'drizzle-orm'
import {
	type UserRecord,
	UserRepository,
} from '@/application/repositories/user-repository'
import { users } from '@/infrastructure/database/schema'
import { database } from '@/lib/drizzle'

export class DrizzleUserRepository extends UserRepository {
	async findByEmail(email: string): Promise<UserRecord | null> {
		const [row] = await database
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1)

		if (!row) return null

		return {
			id: row.id,
			name: row.name,
			email: row.email,
			phone: row.phone,
			role: row.role,
			passwordHash: row.passwordHash,
		}
	}

	async findById(id: string): Promise<UserRecord | null> {
		const [row] = await database
			.select()
			.from(users)
			.where(eq(users.id, id))
			.limit(1)

		if (!row) return null

		return {
			id: row.id,
			name: row.name,
			email: row.email,
			phone: row.phone,
			role: row.role,
			passwordHash: row.passwordHash,
		}
	}

	async save(user: {
		name: string
		email: string
		phone: string | null
		role: string
		passwordHash: string | null
	}): Promise<{ id: string }> {
		const [row] = await database
			.insert(users)
			.values({
				name: user.name,
				email: user.email,
				phone: user.phone,
				role: user.role,
				passwordHash: user.passwordHash,
			})
			.returning({ id: users.id })

		return { id: row.id }
	}

	async updatePasswordHash(
		userId: string,
		passwordHash: string
	): Promise<void> {
		await database
			.update(users)
			.set({ passwordHash })
			.where(eq(users.id, userId))
	}

	async existsByEmail(email: string): Promise<boolean> {
		const [row] = await database
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, email))
			.limit(1)

		return !!row
	}
}
