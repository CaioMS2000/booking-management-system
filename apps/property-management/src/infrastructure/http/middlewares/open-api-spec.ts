import type { OpenAPIV3 } from 'openapi-types'
import type { FastifyInstance } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'

export const openApiSpecPlugin = fastifyPlugin(async (app: FastifyInstance) => {
	app.get('/openapi.json', {
		schema: { hide: true },
		handler: async (_req, reply) => {
			const apiSpec = app.swagger() as OpenAPIV3.Document
			return reply.send(apiSpec)
		},
	})
})
