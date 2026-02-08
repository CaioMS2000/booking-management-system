import { type Auth } from 'better-auth'
import { FastifyInstance, FastifyRequest } from 'fastify'

type Resources = { auth: Auth }

async function createFetchRequest(req: FastifyRequest): Promise<Request> {
	const url = new URL(req.url, `http://${req.headers.host}`)

	const headers = new Headers()
	for (const [key, value] of Object.entries(req.headers)) {
		if (value) {
			if (Array.isArray(value)) {
				for (const v of value) {
					headers.append(key, v)
				}
			} else {
				headers.append(key, value)
			}
		}
	}

	const hasBody = req.method !== 'GET' && req.method !== 'HEAD'

	return new Request(url, {
		method: req.method,
		headers,
		body: hasBody ? JSON.stringify(req.body) : undefined,
	})
}

export async function betterAuthSetup(
	app: FastifyInstance,
	resources: Resources
) {
	app.route({
		method: ['GET', 'POST'],
		url: '/auth/*',
		schema: { hide: true },
		handler: async (req, reply) => {
			const request = await createFetchRequest(req)
			const response = await resources.auth.handler(request)

			reply.status(response.status)
			for (const [key, value] of response.headers) {
				reply.header(key, value)
			}

			const body = await response.text()
			return reply.send(body || null)
		},
	})

	app.route({
		method: ['GET', 'POST'],
		url: '/auth',
		schema: { hide: true },
		handler: async (req, reply) => {
			const request = await createFetchRequest(req)
			const response = await resources.auth.handler(request)

			reply.status(response.status)
			for (const [key, value] of response.headers) {
				reply.header(key, value)
			}

			const body = await response.text()
			return reply.send(body || null)
		},
	})
}
