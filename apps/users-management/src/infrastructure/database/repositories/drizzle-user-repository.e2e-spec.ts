import { describe, it, expect, afterAll, afterEach } from 'vitest'
import { cleanDatabase, closeDatabase } from '@/test/setup-database'
import { DrizzleUserRepository } from './drizzle-user-repository'

const repository = new DrizzleUserRepository()

describe('DrizzleUserRepository', () => {
	afterEach(async () => {
		await cleanDatabase()
	})

	afterAll(async () => {
		await closeDatabase()
	})

	it('should save a user and return the generated id', async () => {
		const result = await repository.save({
			name: 'John Doe',
			email: 'john@example.com',
			phone: '+5511999990000',
			role: 'HOST',
			passwordHash: 'hashed-password-123',
		})

		expect(result.id).toBeDefined()
		expect(typeof result.id).toBe('string')
	})

	it('should find a user by email', async () => {
		await repository.save({
			name: 'John Doe',
			email: 'john@example.com',
			phone: '+5511999990000',
			role: 'HOST',
			passwordHash: 'hashed-password-123',
		})

		const found = await repository.findByEmail('john@example.com')

		expect(found).not.toBeNull()
		expect(found!.name).toBe('John Doe')
		expect(found!.email).toBe('john@example.com')
		expect(found!.role).toBe('HOST')
		expect(found!.passwordHash).toBe('hashed-password-123')
	})

	it('should return null when email is not found', async () => {
		const found = await repository.findByEmail('nonexistent@example.com')
		expect(found).toBeNull()
	})

	it('should find a user by id', async () => {
		const { id } = await repository.save({
			name: 'Jane Doe',
			email: 'jane@example.com',
			phone: '+5511999990001',
			role: 'GUEST',
			passwordHash: 'hashed-password-456',
		})

		const found = await repository.findById(id)

		expect(found).not.toBeNull()
		expect(found!.id).toBe(id)
		expect(found!.name).toBe('Jane Doe')
		expect(found!.email).toBe('jane@example.com')
	})

	it('should return null when id is not found', async () => {
		const found = await repository.findById(
			'00000000-0000-0000-0000-000000000000'
		)
		expect(found).toBeNull()
	})

	it('should return true when email exists', async () => {
		await repository.save({
			name: 'John Doe',
			email: 'john@example.com',
			phone: '+5511999990000',
			role: 'HOST',
			passwordHash: 'hashed-password-123',
		})

		const exists = await repository.existsByEmail('john@example.com')
		expect(exists).toBe(true)
	})

	it('should return false when email does not exist', async () => {
		const exists = await repository.existsByEmail('nonexistent@example.com')
		expect(exists).toBe(false)
	})

	it('should update password hash for an existing user', async () => {
		const { id } = await repository.save({
			name: 'Social User',
			email: 'social@example.com',
			phone: null,
			role: 'GUEST',
			passwordHash: null,
		})

		await repository.updatePasswordHash(id, 'new-hashed-password')

		const found = await repository.findById(id)

		expect(found).not.toBeNull()
		expect(found!.passwordHash).toBe('new-hashed-password')
	})
})
