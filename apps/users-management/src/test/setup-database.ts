import Redis from 'ioredis'
import { database } from '@/lib/drizzle'
import { users } from '@/infrastructure/database/schema'
import { env } from '@/config/env'

export async function cleanDatabase() {
	await database.delete(users)
}

export async function closeDatabase() {
	await database.$client.end()
}

let redis: Redis | null = null

export function getTestRedis(): Redis {
	if (!redis) {
		redis = new Redis(env.REDIS_URL)
	}
	return redis
}

export async function cleanRedis() {
	const r = getTestRedis()
	await r.flushdb()
}

export async function closeRedis() {
	if (redis) {
		await redis.quit()
		redis = null
	}
}
