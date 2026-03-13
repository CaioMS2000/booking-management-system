import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { cleanRedis, closeRedis, getTestRedis } from '@/test/setup-database'
import { rateLimitPlugin } from './rate-limit'

let app: FastifyInstance

beforeAll(async () => {
	app = Fastify()
	await app.register(rateLimitPlugin)

	app.get('/test-route', {
		config: {
			rateLimit: { max: 3, timeWindow: '1 minute' },
		},
		handler: async (_req, reply) => {
			return reply.send({ ok: true })
		},
	})

	await app.ready()
})

afterEach(async () => {
	await cleanRedis()
})

afterAll(async () => {
	await app.close()
	await closeRedis()
})

describe('Rate Limit Plugin', () => {
	it('should allow requests within the limit', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/test-route',
			remoteAddress: '10.0.0.1',
		})

		expect(response.statusCode).toBe(200)
		expect(response.headers['x-ratelimit-limit']).toBe('3')
		expect(response.headers['x-ratelimit-remaining']).toBe('2')
		expect(response.headers['x-ratelimit-reset']).toBeDefined()
	})

	it('should block requests exceeding the limit with 429', async () => {
		const ip = '10.0.0.2'

		for (let i = 0; i < 3; i++) {
			await app.inject({
				method: 'GET',
				url: '/test-route',
				remoteAddress: ip,
			})
		}

		const blocked = await app.inject({
			method: 'GET',
			url: '/test-route',
			remoteAddress: ip,
		})

		expect(blocked.statusCode).toBe(429)
		expect(blocked.headers['retry-after']).toBeDefined()
		expect(blocked.headers['x-ratelimit-limit']).toBe('3')
		expect(blocked.headers['x-ratelimit-remaining']).toBe('0')
	})

	it('should track limits independently per IP', async () => {
		const ipA = '10.0.0.3'
		const ipB = '10.0.0.4'

		for (let i = 0; i < 3; i++) {
			await app.inject({
				method: 'GET',
				url: '/test-route',
				remoteAddress: ipA,
			})
		}

		const blockedA = await app.inject({
			method: 'GET',
			url: '/test-route',
			remoteAddress: ipA,
		})

		const allowedB = await app.inject({
			method: 'GET',
			url: '/test-route',
			remoteAddress: ipB,
		})

		expect(blockedA.statusCode).toBe(429)
		expect(allowedB.statusCode).toBe(200)
	})
})
