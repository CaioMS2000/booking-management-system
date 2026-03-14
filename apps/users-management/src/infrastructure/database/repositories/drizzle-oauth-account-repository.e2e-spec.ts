import { describe, it, expect, afterAll, beforeEach } from 'vitest'
import { database } from '@/lib/drizzle'
import { oauthAccounts, users } from '@/infrastructure/database/schema'
import { cleanDatabase, closeDatabase } from '@/test/setup-database'
import { DrizzleOAuthAccountRepository } from './drizzle-oauth-account-repository'

const repository = new DrizzleOAuthAccountRepository()

async function createTestUser(email: string) {
	const [row] = await database
		.insert(users)
		.values({
			name: 'Test User',
			email,
			phone: null,
			role: 'GUEST',
			passwordHash: null,
		})
		.returning({ id: users.id })
	return row.id
}

describe('DrizzleOAuthAccountRepository', () => {
	beforeEach(async () => {
		await database.delete(oauthAccounts)
		await cleanDatabase()
	})

	afterAll(async () => {
		await closeDatabase()
	})

	it('should save and find an oauth account by provider and account id', async () => {
		const userId = await createTestUser('test@example.com')

		await repository.save({
			userId,
			provider: 'google',
			providerAccountId: 'google-123',
		})

		const found = await repository.findByProviderAndAccountId(
			'google',
			'google-123'
		)

		expect(found).not.toBeNull()
		expect(found!.userId).toBe(userId)
		expect(found!.provider).toBe('google')
		expect(found!.providerAccountId).toBe('google-123')
	})

	it('should return null for non-existent provider account', async () => {
		const found = await repository.findByProviderAndAccountId(
			'google',
			'non-existent'
		)
		expect(found).toBeNull()
	})

	it('should allow multiple providers for the same user', async () => {
		const userId = await createTestUser('multi@example.com')

		await repository.save({
			userId,
			provider: 'google',
			providerAccountId: 'google-456',
		})

		await repository.save({
			userId,
			provider: 'facebook',
			providerAccountId: 'fb-789',
		})

		const google = await repository.findByProviderAndAccountId(
			'google',
			'google-456'
		)
		const facebook = await repository.findByProviderAndAccountId(
			'facebook',
			'fb-789'
		)

		expect(google).not.toBeNull()
		expect(facebook).not.toBeNull()
		expect(google!.userId).toBe(userId)
		expect(facebook!.userId).toBe(userId)
	})
})
