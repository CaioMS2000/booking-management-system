import 'reflect-metadata'
import '@/globals'
import '@/init'
import fastifyCors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import { FastifyListenOptions, FastifyReply, FastifyRequest } from 'fastify'
import { dayjs } from '@repo/core'
import { env } from '@/config/env'
import { app } from './app'
import {
	systemSettingDefaults,
	SystemSettingKey,
} from '@repo/system-settings-manager'
import { createLogger } from '@repo/core'
import { APP_TOKENS } from '@/tokens'
import { PROPERTY_MODULE_TOKENS } from '@/modules/property-module/tokens'
import { HostRepository } from '@/modules/property-module/application/repositories/host-repository'
import { PropertyRepository } from '@/modules/property-module/application/repositories/property-repository'
import { ListingRepository } from '@/modules/property-module/application/repositories/listing-repository'
import { CreatePropertyUseCase } from '@/modules/property-module/application/use-cases/create-property-use-case'
import { GetPropertyUseCase } from '@/modules/property-module/application/use-cases/get-property-use-case'
import { GetAllPropertiesUseCase } from '@/modules/property-module/application/use-cases/get-all-properties-use-case'
import { UpdatePropertyUseCase } from '@/modules/property-module/application/use-cases/update-property-use-case'
import { DeletePropertyUseCase } from '@/modules/property-module/application/use-cases/delete-property-use-case'
import { CreateListingUseCase } from '@/modules/property-module/application/use-cases/create-listing-use-case'
import { GetListingUseCase } from '@/modules/property-module/application/use-cases/get-listing-use-case'
import { GetAllListingsUseCase } from '@/modules/property-module/application/use-cases/get-all-listings-use-case'
import { UpdateListingUseCase } from '@/modules/property-module/application/use-cases/update-listing-use-case'
import { DeleteListingUseCase } from '@/modules/property-module/application/use-cases/delete-listing-use-case'
import { PropertyController } from '@/modules/property-module/infrastructure/http/controllers/property-controller'
import { ListingController } from '@/modules/property-module/infrastructure/http/controllers/listing-controller'

const logger = createLogger({ component: 'HTTP Server' })
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
	const systemConfigService = container.resolve(APP_TOKENS.SystemConfigService)
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

	// --- Property Module Controllers ---
	const hostRepository = container.resolve<HostRepository>(
		PROPERTY_MODULE_TOKENS.HostRepository
	)
	const propertyRepository = container.resolve<PropertyRepository>(
		PROPERTY_MODULE_TOKENS.PropertyRepository
	)
	const listingRepository = container.resolve<ListingRepository>(
		PROPERTY_MODULE_TOKENS.ListingRepository
	)

	const propertyController = new PropertyController({
		app,
		createPropertyUseCase: new CreatePropertyUseCase({
			hostRepository,
			propertyRepository,
		}),
		getPropertyUseCase: new GetPropertyUseCase({
			hostRepository,
			propertyRepository,
		}),
		getAllPropertiesUseCase: new GetAllPropertiesUseCase({
			hostRepository,
			propertyRepository,
		}),
		updatePropertyUseCase: new UpdatePropertyUseCase({
			hostRepository,
			propertyRepository,
		}),
		deletePropertyUseCase: new DeletePropertyUseCase({
			hostRepository,
			propertyRepository,
			listingRepository,
		}),
	})

	const listingController = new ListingController({
		app,
		createListingUseCase: new CreateListingUseCase({
			hostRepository,
			propertyRepository,
			listingRepository,
		}),
		getListingUseCase: new GetListingUseCase({ listingRepository }),
		getAllListingsUseCase: new GetAllListingsUseCase({ listingRepository }),
		updateListingUseCase: new UpdateListingUseCase({
			hostRepository,
			propertyRepository,
			listingRepository,
		}),
		deleteListingUseCase: new DeleteListingUseCase({
			hostRepository,
			propertyRepository,
			listingRepository,
		}),
	})

	propertyController.registerRoutes()
	listingController.registerRoutes()

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
		logger.debug(str)
	} catch (error) {
		app.log.error(error)
		process.exit(1)
	}
}

void bootstrap()
