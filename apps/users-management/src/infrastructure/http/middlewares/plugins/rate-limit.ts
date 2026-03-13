import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import { redisClient } from '@/infrastructure/database/redis/redis-client'

export const rateLimitPlugin = fastifyPlugin(async (app: FastifyInstance) => {
	await app.register(rateLimit, {
		global: false,
		redis: redisClient,
		keyGenerator: request => request.ip,
	})
})
