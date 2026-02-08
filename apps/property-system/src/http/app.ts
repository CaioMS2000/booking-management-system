import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import ScalarApiReference from '@scalar/fastify-api-reference'
import { fastify } from 'fastify'
import {
	jsonSchemaTransform,
	serializerCompiler,
	validatorCompiler,
} from 'fastify-type-provider-zod'
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes'
import { errorHandler } from './middlewares/error-handler'
import { contextPlugin } from './middlewares/plugins/context'
import { requestLogger } from './middlewares/plugins/request-logger'

const app = fastify({ trustProxy: true })

// third-party resources
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// zod -> JSON Schema transform com fallback para esquemas já em JSON Schema
const safeTransform: typeof jsonSchemaTransform = input => {
	try {
		return jsonSchemaTransform(input)
	} catch {
		return input.schema as any
	}
}

app.register(swagger, {
	openapi: {
		openapi: '3.1.0',
		info: { title: 'WPP Bot API', version: '1.0.0' },
		components: {
			securitySchemes: {
				cookieAuth: {
					type: 'apiKey',
					in: 'cookie',
					name: 'better-auth.session_token',
				},
			},
		},
		security: [{ cookieAuth: [] }],
	},
	transform: safeTransform,
})

const theme = new SwaggerTheme()
const content = theme.getBuffer(SwaggerThemeNameEnum.DARK)

app.register(swaggerUI, {
	routePrefix: '/docs/swagger',
	theme: {
		css: [
			{
				filename: 'theme.css',
				content,
			},
		],
	},
	transformSpecificationClone: true,
	transformSpecification(spec, req) {
		const authSpec = (req.server as any)._cachedAuthSpec
		if (!authSpec) return spec

		// Mesclar specs
		return {
			...spec,
			paths: { ...spec.paths, ...authSpec.paths },
			tags: [...(spec.tags ?? []), ...(authSpec.tags ?? [])],
			components: {
				...spec.components,
				schemas: {
					...spec.components?.schemas,
					...authSpec.components?.schemas,
				},
				securitySchemes: {
					...spec.components?.securitySchemes,
					...authSpec.components?.securitySchemes,
				},
			},
		}
	},
})
app.register(ScalarApiReference, {
	routePrefix: '/docs',
	configuration: {
		url: '/openapi.json',
	},
})

// custom resources
app.register(requestLogger)
app.register(contextPlugin)
app.setErrorHandler(errorHandler)

export { app }
