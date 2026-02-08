import type { OpenAPIV3 } from 'openapi-types'
import type { FastifyInstance } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import { type Auth } from 'better-auth'
import { patchAuthSpec } from '../utils/http-spec'
import { transformAuthSpec } from '../openapi/transform-auth-spec'

type AuthApiWithOpenAPI = Auth['api'] & {
	generateOpenAPISchema: () => Promise<OpenAPIV3.Document>
}

type Resources = {
	api: AuthApiWithOpenAPI
}

export const openApiSpecPlugin = fastifyPlugin(
	async (app: FastifyInstance, resources: Resources) => {
		// Endpoint que mescla os specs OpenAPI da API e Auth (para Scalar e acesso direto)
		app.get('/openapi.json', {
			schema: { hide: true },
			handler: async (_req, reply) => {
				const apiSpec = app.swagger() as OpenAPIV3.Document
				const authSpec = await resources.api.generateOpenAPISchema()
				patchAuthSpec(authSpec)
				const {
					paths: authPaths,
					tags: authTags,
					components,
				} = transformAuthSpec(authSpec)

				return reply.send({
					...apiSpec,
					paths: { ...apiSpec.paths, ...authPaths },
					tags: [...(apiSpec.tags ?? []), ...authTags],
					components: {
						...apiSpec.components,
						schemas: {
							...apiSpec.components?.schemas,
							...(components.schemas ?? {}),
						},
						securitySchemes: {
							...apiSpec.components?.securitySchemes,
							...(components.securitySchemes ?? {}),
						},
					},
				})
			},
		})
	}
)
