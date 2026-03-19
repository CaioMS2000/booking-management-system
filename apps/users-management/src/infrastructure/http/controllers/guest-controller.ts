import { Class } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { DeleteGuestUseCase } from '@/application/use-cases/guest/delete-guest-use-case'
import type { GetGuestUseCase } from '@/application/use-cases/guest/get-guest-use-case'
import type { UpdateGuestUseCase } from '@/application/use-cases/guest/update-guest-use-case'
import { getAuthenticatedUser } from '@/context/get-authenticated-user'
import type { Guest } from '@/domain/models/guest'
import type { RouteConfig } from '@/infrastructure/http/@types/routes'
import { mapDomainErrorToAppError } from '@/infrastructure/http/domain-error-mapper'
import { errorEnvelopeSchema } from '@/infrastructure/http/errors'
import { roleGuard } from '@/infrastructure/http/middlewares/role-guard'
import {
	guestResponseSchema,
	updateGuestBodySchema,
	userIdParamsSchema,
} from '@/infrastructure/http/schemas/auth-schemas'

type GuestControllerProps = {
	app: FastifyInstance
	getGuestUseCase: GetGuestUseCase
	updateGuestUseCase: UpdateGuestUseCase
	deleteGuestUseCase: DeleteGuestUseCase
}

export class GuestController extends Class<GuestControllerProps> {
	constructor(protected props: GuestControllerProps) {
		super()
	}

	get app() {
		return this.props.app
	}

	registerRoutes() {
		this.app.register(this.getGuestRoute())
		this.app.register(this.updateGuestRoute())
		this.app.register(this.deleteGuestRoute())
	}

	private getGuestRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: userIdParamsSchema,
				response: {
					200: guestResponseSchema,
					403: errorEnvelopeSchema,
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().get('/api/v1/guests/:id', {
				schema: {
					tags: ['Guests'],
					summary: 'Get a guest by ID',
					...config,
				},
				onRequest: [roleGuard('ADMIN', 'GUEST')],
				handler: async (req, reply) => {
					const requester = getAuthenticatedUser()
					const result = await this.props.getGuestUseCase.execute({
						requesterId: requester.id,
						requesterRole: requester.role,
						guestId: req.params.id,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.send(this.serialize(result.value.guest))
				},
			})
		})
	}

	private updateGuestRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: userIdParamsSchema,
				body: updateGuestBodySchema,
				response: {
					200: guestResponseSchema,
					400: errorEnvelopeSchema,
					403: errorEnvelopeSchema,
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().put('/api/v1/guests/:id', {
				schema: {
					tags: ['Guests'],
					summary: 'Update a guest',
					...config,
				},
				onRequest: [roleGuard('ADMIN', 'GUEST')],
				handler: async (req, reply) => {
					const requester = getAuthenticatedUser()
					const result = await this.props.updateGuestUseCase.execute({
						requesterId: requester.id,
						requesterRole: requester.role,
						guestId: req.params.id,
						...req.body,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.send(this.serialize(result.value.guest))
				},
			})
		})
	}

	private deleteGuestRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: userIdParamsSchema,
				response: {
					204: {},
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().delete('/api/v1/guests/:id', {
				schema: {
					tags: ['Guests'],
					summary: 'Delete a guest',
					...config,
				},
				onRequest: [roleGuard('ADMIN')],
				handler: async (req, reply) => {
					const result = await this.props.deleteGuestUseCase.execute({
						guestId: req.params.id,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.status(204).send()
				},
			})
		})
	}

	private serialize(guest: Guest) {
		return {
			id: String(guest.id),
			name: guest.name,
			email: guest.email.value,
			phone: guest.phone.value,
			deletedAt: guest.deletedAt?.toISOString() ?? null,
		}
	}
}
