import type Redis from 'ioredis'
import {
	type OAuthStateData,
	OAuthStateRepository,
} from '@/application/repositories/oauth-state-repository'

const KEY_PREFIX = 'oauth:state:'

export class RedisOAuthStateRepository extends OAuthStateRepository {
	constructor(private readonly redis: Redis) {
		super()
	}

	async save(
		state: string,
		data: OAuthStateData,
		expiresInSeconds: number
	): Promise<void> {
		const key = `${KEY_PREFIX}${state}`
		await this.redis.set(key, JSON.stringify(data), 'EX', expiresInSeconds)
	}

	async findAndDelete(state: string): Promise<OAuthStateData | null> {
		const key = `${KEY_PREFIX}${state}`
		const raw = await this.redis.getdel(key)

		if (!raw) return null

		return JSON.parse(raw) as OAuthStateData
	}
}
