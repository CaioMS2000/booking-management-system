import { Class } from '@repo/core'
import { FastifyInstance } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { RouteConfig } from '@/infrastructure/http/@types/routes'
import { CreateListingUseCase } from '@/modules/property-module/application/use-cases/create-listing-use-case'

type PropertyControllerProps = {
	app: FastifyInstance
	createListingUseCase: CreateListingUseCase
	// x: X
}

export class PropertyController extends Class<PropertyControllerProps> {
	constructor(protected props: PropertyControllerProps) {
		super()
	}

	get app() {
		return this.props.app
	}

	registerListingCreation() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().get('some/path', {
				schema: {
					tags: ['Some useful tag'],
					summary: 'Optional summary for the endpoint',
					...config,
				},
				handler: async (req, reply) => {
					return reply.send()
				},
			})
		})
	}

	registerRoutes() {
		this.app.register(this.registerListingCreation())
		// return fastifyPlugin(async (app: FastifyInstance) => {})
	}
}
