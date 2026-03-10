export type UserRecord = {
	id: string
	name: string
	email: string
	phone: string
	role: string
	passwordHash: string
}

export abstract class UserRepository {
	abstract findByEmail(email: string): Promise<UserRecord | null>
	abstract findById(id: string): Promise<UserRecord | null>
	abstract save(user: {
		name: string
		email: string
		phone: string
		role: string
		passwordHash: string
	}): Promise<{ id: string }>
	abstract existsByEmail(email: string): Promise<boolean>
}
