import { Class, DateInterval, UniqueId } from '@repo/core'
import { FastifyInstance } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { appContext } from '@/application-context'
import type { RouteConfig } from '@/infrastructure/http/@types/routes'
import { AppError } from '@/infrastructure/http/errors'
import type { CreateListingUseCase } from '@/modules/property-module/application/use-cases/create-listing-use-case'
import type { DeleteListingUseCase } from '@/modules/property-module/application/use-cases/delete-listing-use-case'
import type { GetAllListingsUseCase } from '@/modules/property-module/application/use-cases/get-all-listings-use-case'
import type { GetListingUseCase } from '@/modules/property-module/application/use-cases/get-listing-use-case'
import type { UpdateListingUseCase } from '@/modules/property-module/application/use-cases/update-listing-use-case'
import { Listing } from '@/modules/property-module/domain/models/listing'
import { mapDomainErrorToAppError } from '../domain-error-mapper'
import { errorEnvelopeSchema } from '@/infrastructure/http/errors'
import {
	createListingBodySchema,
	listingFiltersQuerySchema,
	listingIdParamsSchema,
	listingResponseSchema,
	updateListingBodySchema,
} from '@repo/shared/dto/http/property-module/listing'

type ListingControllerProps = {
	app: FastifyInstance
	createListingUseCase: CreateListingUseCase
	getListingUseCase: GetListingUseCase
	getAllListingsUseCase: GetAllListingsUseCase
	updateListingUseCase: UpdateListingUseCase
	deleteListingUseCase: DeleteListingUseCase
}

export class ListingController extends Class<ListingControllerProps> {
	constructor(protected props: ListingControllerProps) {
		super()
	}

	get app() {
		return this.props.app
	}

	registerRoutes() {
		this.app.register(this.createListingRoute())
		this.app.register(this.getListingRoute())
		this.app.register(this.getAllListingsRoute())
		this.app.register(this.updateListingRoute())
		this.app.register(this.deleteListingRoute())
	}

	private createListingRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				body: createListingBodySchema,
				response: {
					201: listingResponseSchema,
					400: errorEnvelopeSchema,
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().post('/api/v1/listings', {
				schema: {
					tags: ['Listings'],
					summary: 'Create a new listing',
					...config,
				},
				handler: async (req, reply) => {
					const hostId = this.getHostId()
					const body = req.body

					const result = await this.props.createListingUseCase.execute({
						hostId: UniqueId(hostId),
						propertyId: UniqueId(body.propertyId),
						pricePerNight: body.pricePerNight,
						intervals: body.intervals
							? this.parseIntervals(body.intervals)
							: undefined,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.status(201).send(this.serialize(result.value.listing))
				},
			})
		})
	}

	private getListingRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: listingIdParamsSchema,
				response: {
					200: listingResponseSchema,
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().get('/api/v1/listings/:id', {
				schema: {
					tags: ['Listings'],
					summary: 'Get a listing by ID',
					...config,
				},
				handler: async (req, reply) => {
					const result = await this.props.getListingUseCase.execute({
						listingId: req.params.id,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.send(this.serialize(result.value.listing))
				},
			})
		})
	}

	private getAllListingsRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				querystring: listingFiltersQuerySchema,
				response: {
					200: listingResponseSchema.array(),
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().get('/api/v1/listings', {
				schema: {
					tags: ['Listings'],
					summary: 'List all listings with optional filters',
					...config,
				},
				handler: async (req, reply) => {
					const { page, limit, ...filters } = req.query

					const result = await this.props.getAllListingsUseCase.execute({
						filters,
						page,
						limit,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.send(result.value.listings.map(l => this.serialize(l)))
				},
			})
		})
	}

	private updateListingRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: listingIdParamsSchema,
				body: updateListingBodySchema,
				response: {
					200: listingResponseSchema,
					400: errorEnvelopeSchema,
					403: errorEnvelopeSchema,
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().put('/api/v1/listings/:id', {
				schema: {
					tags: ['Listings'],
					summary: 'Update a listing',
					...config,
				},
				handler: async (req, reply) => {
					const hostId = this.getHostId()
					const body = req.body

					const result = await this.props.updateListingUseCase.execute({
						listingId: req.params.id,
						hostId,
						pricePerNight: body.pricePerNight,
						intervals: body.intervals
							? this.parseIntervals(body.intervals)
							: undefined,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.send(this.serialize(result.value.listing))
				},
			})
		})
	}

	private deleteListingRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: listingIdParamsSchema,
				response: {
					204: {},
					403: errorEnvelopeSchema,
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().delete('/api/v1/listings/:id', {
				schema: {
					tags: ['Listings'],
					summary: 'Delete a listing',
					...config,
				},
				handler: async (req, reply) => {
					const hostId = this.getHostId()

					const result = await this.props.deleteListingUseCase.execute({
						listingId: req.params.id,
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
		const ctx = appContext.get()
		if (!ctx.userId) throw AppError.unauthenticated()
		return ctx.userId
	}

	private parseIntervals(
		raw: Array<{
			from: string
			to: string
			status: string
			expiresAt?: string
		}>
	): DateInterval[] {
		return raw.map(i => ({
			from: new Date(i.from),
			to: new Date(i.to),
			status: i.status as DateInterval['status'],
			expiresAt: i.expiresAt ? new Date(i.expiresAt) : undefined,
		}))
	}

	private serialize(listing: Listing) {
		return {
			id: listing.id,
			propertyId: listing.propertyId,
			publicId: listing.publicId,
			pricePerNight: listing.pricePerNight,
			intervals: listing.intervals.map(i => ({
				from: i.from.toISOString(),
				to: i.to.toISOString(),
				status: i.status,
				expiresAt: i.expiresAt?.toISOString(),
			})),
			deletedAt: listing.deletedAt?.toISOString() ?? null,
		}
	}
}
