import { Class, Name } from '@repo/core'
import { FastifyInstance } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { appContext } from '@/application-context'
import type { RouteConfig } from '@/infrastructure/http/@types/routes'
import type { CreatePropertyUseCase } from '@/modules/property-module/application/use-cases/create-property-use-case'
import type { DeletePropertyUseCase } from '@/modules/property-module/application/use-cases/delete-property-use-case'
import type { GetAllPropertiesUseCase } from '@/modules/property-module/application/use-cases/get-all-properties-use-case'
import type { GetPropertyUseCase } from '@/modules/property-module/application/use-cases/get-property-use-case'
import type { UpdatePropertyUseCase } from '@/modules/property-module/application/use-cases/update-property-use-case'
import { Property } from '@/modules/property-module/domain/models/property'

import { mapDomainErrorToAppError } from '../domain-error-mapper'
import { errorEnvelopeSchema } from '@/infrastructure/http/errors'
import {
	createPropertyBodySchema,
	propertyIdParamsSchema,
	propertyResponseSchema,
	updatePropertyBodySchema,
} from '@repo/shared/dto/http/property-module/property'

type PropertyControllerProps = {
	app: FastifyInstance
	createPropertyUseCase: CreatePropertyUseCase
	getPropertyUseCase: GetPropertyUseCase
	getAllPropertiesUseCase: GetAllPropertiesUseCase
	updatePropertyUseCase: UpdatePropertyUseCase
	deletePropertyUseCase: DeletePropertyUseCase
}

export class PropertyController extends Class<PropertyControllerProps> {
	constructor(protected props: PropertyControllerProps) {
		super()
	}

	get app() {
		return this.props.app
	}

	registerRoutes() {
		this.app.register(this.createPropertyRoute())
		this.app.register(this.getPropertyRoute())
		this.app.register(this.getAllPropertiesRoute())
		this.app.register(this.updatePropertyRoute())
		this.app.register(this.deletePropertyRoute())
	}

	private createPropertyRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				body: createPropertyBodySchema,
				response: {
					201: propertyResponseSchema,
					400: errorEnvelopeSchema,
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().post('/api/v1/properties', {
				schema: {
					tags: ['Properties'],
					summary: 'Create a new property',
					...config,
				},
				handler: async (req, reply) => {
					const hostId = this.getHostId()
					const body = req.body

					const result = await this.props.createPropertyUseCase.execute({
						hostId,
						name: Name(body.name),
						description: body.description,
						capacity: body.capacity,
						propertyType: body.propertyType,
						address: body.address,
						imagesUrls: body.imagesUrls,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.status(201).send(this.serialize(result.value.property))
				},
			})
		})
	}

	private getPropertyRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: propertyIdParamsSchema,
				response: {
					200: propertyResponseSchema,
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().get('/api/v1/properties/:id', {
				schema: {
					tags: ['Properties'],
					summary: 'Get a property by ID',
					...config,
				},
				handler: async (req, reply) => {
					const hostId = this.getHostId()

					const result = await this.props.getPropertyUseCase.execute({
						hostId,
						propertyId: req.params.id,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.send(this.serialize(result.value.property))
				},
			})
		})
	}

	private getAllPropertiesRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				response: {
					200: propertyResponseSchema.array(),
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().get('/api/v1/properties', {
				schema: {
					tags: ['Properties'],
					summary: 'List all properties for the authenticated host',
					...config,
				},
				handler: async (req, reply) => {
					const hostId = this.getHostId()

					const result = await this.props.getAllPropertiesUseCase.execute({
						hostId,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.send(result.value.properties.map(p => this.serialize(p)))
				},
			})
		})
	}

	private updatePropertyRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: propertyIdParamsSchema,
				body: updatePropertyBodySchema,
				response: {
					200: propertyResponseSchema,
					400: errorEnvelopeSchema,
					403: errorEnvelopeSchema,
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().put('/api/v1/properties/:id', {
				schema: {
					tags: ['Properties'],
					summary: 'Update a property',
					...config,
				},
				handler: async (req, reply) => {
					const hostId = this.getHostId()

					const result = await this.props.updatePropertyUseCase.execute({
						propertyId: req.params.id,
						hostId,
						...req.body,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.send(this.serialize(result.value.property))
				},
			})
		})
	}

	private deletePropertyRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: propertyIdParamsSchema,
				response: {
					204: {},
					403: errorEnvelopeSchema,
					404: errorEnvelopeSchema,
					409: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().delete('/api/v1/properties/:id', {
				schema: {
					tags: ['Properties'],
					summary: 'Delete a property',
					...config,
				},
				handler: async (req, reply) => {
					const hostId = this.getHostId()

					const result = await this.props.deletePropertyUseCase.execute({
						propertyId: req.params.id,
						hostId,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.status(204).send()
				},
			})
		})
	}

	private getHostId(): string {
		return appContext.get().user.id
	}

	private serialize(property: Property) {
		return {
			id: property.id,
			hostId: property.hostId,
			publicId: property.publicId,
			name: property.name,
			description: property.description,
			capacity: property.capacity,
			propertyType: property.type,
			address: property.address,
			imagesUrls: property.imagesUrls,
			deletedAt: property.deletedAt?.toISOString() ?? null,
		}
	}
}
