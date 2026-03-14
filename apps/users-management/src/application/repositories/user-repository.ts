export type UserRecord = {
	id: string
	name: string
	email: string
	phone: string | null
	role: string
	passwordHash: string | null
}

export abstract class UserRepository {
	abstract findByEmail(email: string): Promise<UserRecord | null>
	abstract findById(id: string): Promise<UserRecord | null>
	abstract save(user: {
		name: string
		email: string
		phone: string | null
		role: string
		passwordHash: string | null
	}): Promise<{ id: string }>
	abstract existsByEmail(email: string): Promise<boolean>
	abstract updatePasswordHash(
		userId: string,
		passwordHash: string
	): Promise<void>
}
