import type Redis from 'ioredis'
import { RefreshTokenRepository } from '@/application/repositories/refresh-token-repository'

type StoredToken = {
	userId: string
	used: boolean
}

const TOKEN_PREFIX = 'rt:'
const USER_PREFIX = 'rt:user:'

export class RedisRefreshTokenRepository extends RefreshTokenRepository {
	constructor(private redis: Redis) {
		super()
	}

	async save(
		userId: string,
		tokenHash: string,
		expiresInSeconds: number
	): Promise<void> {
		const data: StoredToken = { userId, used: false }

		await this.redis
			.pipeline()
			.setex(
				`${TOKEN_PREFIX}${tokenHash}`,
				expiresInSeconds,
				JSON.stringify(data)
			)
			.sadd(`${USER_PREFIX}${userId}`, tokenHash)
			.expire(`${USER_PREFIX}${userId}`, expiresInSeconds)
			.exec()
	}

	async findByTokenHash(
		tokenHash: string
	): Promise<{ userId: string; used: boolean } | null> {
		const raw = await this.redis.get(`${TOKEN_PREFIX}${tokenHash}`)
		if (!raw) return null

		const data: StoredToken = JSON.parse(raw)
		return { userId: data.userId, used: data.used }
	}

	async revoke(tokenHash: string): Promise<void> {
		const raw = await this.redis.get(`${TOKEN_PREFIX}${tokenHash}`)
		if (raw) {
			const data: StoredToken = JSON.parse(raw)
			await this.redis
				.pipeline()
				.del(`${TOKEN_PREFIX}${tokenHash}`)
				.srem(`${USER_PREFIX}${data.userId}`, tokenHash)
				.exec()
		}
	}

	async revokeAllForUser(userId: string): Promise<void> {
		const tokenHashes = await this.redis.smembers(`${USER_PREFIX}${userId}`)

		if (tokenHashes.length > 0) {
			const pipeline = this.redis.pipeline()
			for (const hash of tokenHashes) {
				pipeline.del(`${TOKEN_PREFIX}${hash}`)
			}
			pipeline.del(`${USER_PREFIX}${userId}`)
			await pipeline.exec()
		}
	}

	async markUsed(tokenHash: string): Promise<void> {
		const raw = await this.redis.get(`${TOKEN_PREFIX}${tokenHash}`)
		if (!raw) return

		const data: StoredToken = JSON.parse(raw)
		data.used = true

		const ttl = await this.redis.ttl(`${TOKEN_PREFIX}${tokenHash}`)
		if (ttl > 0) {
			await this.redis.setex(
				`${TOKEN_PREFIX}${tokenHash}`,
				ttl,
				JSON.stringify(data)
			)
		}
	}
}
