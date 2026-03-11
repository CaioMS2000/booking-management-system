import { describe, it, expect, afterAll, afterEach } from 'vitest'
import { cleanRedis, closeRedis, getTestRedis } from '@/test/setup-database'
import { RedisRefreshTokenRepository } from './redis-refresh-token-repository'

const redis = getTestRedis()
const repository = new RedisRefreshTokenRepository(redis)

describe('RedisRefreshTokenRepository', () => {
	afterEach(async () => {
		await cleanRedis()
	})

	afterAll(async () => {
		await closeRedis()
	})

	it('should save a token and find it by hash', async () => {
		await repository.save('user-1', 'token-hash-1', 3600)

		const found = await repository.findByTokenHash('token-hash-1')

		expect(found).not.toBeNull()
		expect(found!.userId).toBe('user-1')
		expect(found!.used).toBe(false)
	})

	it('should return null for non-existent token hash', async () => {
		const found = await repository.findByTokenHash('non-existent')
		expect(found).toBeNull()
	})

	it('should revoke a token', async () => {
		await repository.save('user-1', 'token-hash-1', 3600)

		await repository.revoke('token-hash-1')

		const found = await repository.findByTokenHash('token-hash-1')
		expect(found).toBeNull()
	})

	it('should revoke all tokens for a user', async () => {
		await repository.save('user-1', 'token-hash-1', 3600)
		await repository.save('user-1', 'token-hash-2', 3600)
		await repository.save('user-2', 'token-hash-3', 3600)

		await repository.revokeAllForUser('user-1')

		expect(await repository.findByTokenHash('token-hash-1')).toBeNull()
		expect(await repository.findByTokenHash('token-hash-2')).toBeNull()
		expect(await repository.findByTokenHash('token-hash-3')).not.toBeNull()
	})

	it('should mark a token as used', async () => {
		await repository.save('user-1', 'token-hash-1', 3600)

		await repository.markUsed('token-hash-1')

		const found = await repository.findByTokenHash('token-hash-1')
		expect(found).not.toBeNull()
		expect(found!.used).toBe(true)
	})

	it('should not fail when revoking non-existent token', async () => {
		await expect(repository.revoke('non-existent')).resolves.not.toThrow()
	})

	it('should not fail when marking non-existent token as used', async () => {
		await expect(repository.markUsed('non-existent')).resolves.not.toThrow()
	})
})
