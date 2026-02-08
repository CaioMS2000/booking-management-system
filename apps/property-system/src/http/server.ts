import '@/globals'
import { type Auth } from 'better-auth'
import fastifyCors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import { FastifyListenOptions, FastifyReply, FastifyRequest } from 'fastify'
import type { OpenAPIV3 } from 'openapi-types'
import { dayjs } from '@/config/date-and-time'
import { env } from '@/config/env'
import { app } from './app'
import { openApiSpecPlugin } from './middlewares/open-api-spec'
import { transformAuthSpec } from './openapi/transform-auth-spec'
import { patchAuthSpec } from './utils/http-spec'
import {
	systemSettingDefaults,
	SystemSettingKey,
} from '@repo/system-settings-manager'
import { betterAuthSetup } from './better-auth'

type AuthApiWithOpenAPI = Auth['api'] & {
	generateOpenAPISchema: () => Promise<OpenAPIV3.Document>
}

async function cacheAuthSpec(api: AuthApiWithOpenAPI, app: any) {
	const authSpec = await api.generateOpenAPISchema()
	patchAuthSpec(authSpec)
	app._cachedAuthSpec = transformAuthSpec(authSpec)
}

async function logHealthRequest(
	request: FastifyRequest,
	_reply: FastifyReply,
	path: string
) {
	const identifier =
		request.headers.origin ?? request.headers.referer ?? request.ip
	const rightNow = dayjs().tz().format('DD/MM/YYYY HH:mm:ss')
	const userAgent = request.headers['user-agent']
	const methodAndUrl = `${request.method} ${request.url}`
	const expectedRquester =
		userAgent &&
		['render'].some(possibility =>
			userAgent.toLocaleLowerCase().includes(possibility)
		)

	if (!expectedRquester) {
		console.log(
			`(${path})[${rightNow}] Health checked\nRequester: ${identifier}\nMethod: ${methodAndUrl} \nUser-Agent: ${userAgent}`
		)
	}
}

async function bootstrap() {
	const betterAuth = container.resolve(TOKENS.Auth)
	const systemConfigService = container.resolve(TOKENS.SystemConfigService)
	const corsConfig =
		systemConfigService.getValue(SystemSettingKey.CORS) ??
		systemSettingDefaults[SystemSettingKey.CORS]!
	const corsOrigins = corsConfig.origins
	const corsCredentials = corsConfig.credentials

	await app.register(fastifyCors, {
		origin: corsOrigins,
		credentials: corsCredentials,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
	})

	const mediaConfig =
		systemConfigService.getValue(SystemSettingKey.MEDIA) ??
		systemSettingDefaults[SystemSettingKey.MEDIA]!

	await app.register(fastifyMultipart, {
		attachFieldsToBody: true,
		limits: {
			fileSize: 1024 * 1024 * mediaConfig.maxFileSizeMb,
			files: mediaConfig.maxFiles,
		},
		async onFile(part) {
			const buf = await part.toBuffer()
			part.value = {
				buffer: buf,
				filename: part.filename,
				mimetype: part.mimetype,
				encoding: part.encoding,
			}
		},
	})

	app.get('/health', async (request, _reply) => {
		await logHealthRequest(request, _reply, 'health')

		return { status: 'ok' }
	})
	app.get('/healthy', async (request, _reply) => {
		await logHealthRequest(request, _reply, 'healthy')

		return { message: 'yes' }
	})

	await app.register(betterAuthSetup, {
		auth: betterAuth,
	})

	await cacheAuthSpec(betterAuth.api as AuthApiWithOpenAPI, app)
	await app.register(openApiSpecPlugin, {
		api: betterAuth.api as AuthApiWithOpenAPI,
	})

	const config: FastifyListenOptions = {
		port: env.PORT,
	}

	if (env.NODE_ENV === 'production') {
		config.host = '0.0.0.0'
	}

	try {
		const address = await app.listen({ ...config })
		let str = ''
		str += address
		str += `\nsystem mode: ${env.NODE_ENV}`
		const nodeEnv = String(env.NODE_ENV).toLowerCase()
		str += `\nlog level: ${nodeEnv === 'development' || nodeEnv === 'test' ? 'debug' : 'info'}`
		str += '\n'
		// logger.debug(str)
	} catch (error) {
		app.log.error(error)
		process.exit(1)
	}
}

void bootstrap()
