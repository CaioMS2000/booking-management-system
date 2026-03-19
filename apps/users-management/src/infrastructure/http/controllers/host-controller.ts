import { Class } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { DeleteHostUseCase } from '@/application/use-cases/host/delete-host-use-case'
import type { GetHostUseCase } from '@/application/use-cases/host/get-host-use-case'
import type { UpdateHostUseCase } from '@/application/use-cases/host/update-host-use-case'
import { getAuthenticatedUser } from '@/context/get-authenticated-user'
import type { Host } from '@/domain/models/host'
import type { RouteConfig } from '@/infrastructure/http/@types/routes'
import { mapDomainErrorToAppError } from '@/infrastructure/http/domain-error-mapper'
import { errorEnvelopeSchema } from '@/infrastructure/http/errors'
import { roleGuard } from '@/infrastructure/http/middlewares/role-guard'
import {
	hostResponseSchema,
	updateHostBodySchema,
	userIdParamsSchema,
} from '@/infrastructure/http/schemas/auth-schemas'

type HostControllerProps = {
	app: FastifyInstance
	getHostUseCase: GetHostUseCase
	updateHostUseCase: UpdateHostUseCase
	deleteHostUseCase: DeleteHostUseCase
}

export class HostController extends Class<HostControllerProps> {
	constructor(protected props: HostControllerProps) {
		super()
	}

	get app() {
		return this.props.app
	}

	registerRoutes() {
		this.app.register(this.getHostRoute())
		this.app.register(this.updateHostRoute())
		this.app.register(this.deleteHostRoute())
	}

	private getHostRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: userIdParamsSchema,
				response: {
					200: hostResponseSchema,
					403: errorEnvelopeSchema,
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().get('/api/v1/hosts/:id', {
				schema: {
					tags: ['Hosts'],
					summary: 'Get a host by ID',
					...config,
				},
				onRequest: [roleGuard('ADMIN', 'HOST')],
				handler: async (req, reply) => {
					const requester = getAuthenticatedUser()
					const result = await this.props.getHostUseCase.execute({
						requesterId: requester.id,
						requesterRole: requester.role,
						hostId: req.params.id,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.send(this.serialize(result.value.host))
				},
			})
		})
	}

	private updateHostRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: userIdParamsSchema,
				body: updateHostBodySchema,
				response: {
					200: hostResponseSchema,
					400: errorEnvelopeSchema,
					403: errorEnvelopeSchema,
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().put('/api/v1/hosts/:id', {
				schema: {
					tags: ['Hosts'],
					summary: 'Update a host',
					...config,
				},
				onRequest: [roleGuard('ADMIN', 'HOST')],
				handler: async (req, reply) => {
					const requester = getAuthenticatedUser()
					const result = await this.props.updateHostUseCase.execute({
						requesterId: requester.id,
						requesterRole: requester.role,
						hostId: req.params.id,
						...req.body,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.send(this.serialize(result.value.host))
				},
			})
		})
	}

	private deleteHostRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: userIdParamsSchema,
				response: {
					204: {},
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().delete('/api/v1/hosts/:id', {
				schema: {
					tags: ['Hosts'],
					summary: 'Delete a host',
					...config,
				},
				onRequest: [roleGuard('ADMIN')],
				handler: async (req, reply) => {
					const result = await this.props.deleteHostUseCase.execute({
						hostId: req.params.id,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.status(204).send()
				},
			})
		})
	}

	private serialize(host: Host) {
		return {
			id: String(host.id),
			name: host.name,
			email: host.email.value,
			phone: host.phone.value,
			deletedAt: host.deletedAt?.toISOString() ?? null,
		}
	}
}
