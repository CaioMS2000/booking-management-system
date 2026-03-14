import { describe, it, expect, afterAll, afterEach } from 'vitest'
import { cleanRedis, closeRedis, getTestRedis } from '@/test/setup-database'
import { RedisOAuthStateRepository } from './redis-oauth-state-repository'

const redis = getTestRedis()
const repository = new RedisOAuthStateRepository(redis)

describe('RedisOAuthStateRepository', () => {
	afterEach(async () => {
		await cleanRedis()
	})

	afterAll(async () => {
		await closeRedis()
	})

	it('should save state and find it', async () => {
		await repository.save(
			'test-state',
			{ codeVerifier: 'verifier-123', provider: 'google' },
			600
		)

		const found = await repository.findAndDelete('test-state')

		expect(found).not.toBeNull()
		expect(found!.codeVerifier).toBe('verifier-123')
		expect(found!.provider).toBe('google')
	})

	it('should delete state after findAndDelete', async () => {
		await repository.save(
			'test-state-2',
			{ codeVerifier: 'verifier-456', provider: 'facebook' },
			600
		)

		await repository.findAndDelete('test-state-2')
		const found = await repository.findAndDelete('test-state-2')

		expect(found).toBeNull()
	})

	it('should return null for non-existent state', async () => {
		const found = await repository.findAndDelete('non-existent')
		expect(found).toBeNull()
	})
})
