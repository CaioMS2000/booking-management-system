import { Class } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { DeleteAdminUseCase } from '@/application/use-cases/admin/delete-admin-use-case'
import type { GetAdminUseCase } from '@/application/use-cases/admin/get-admin-use-case'
import type { UpdateAdminUseCase } from '@/application/use-cases/admin/update-admin-use-case'
import type { Admin } from '@/domain/models/admin'
import type { RouteConfig } from '@/infrastructure/http/@types/routes'
import { mapDomainErrorToAppError } from '@/infrastructure/http/domain-error-mapper'
import { errorEnvelopeSchema } from '@/infrastructure/http/errors'
import { roleGuard } from '@/infrastructure/http/middlewares/role-guard'
import {
	adminResponseSchema,
	updateAdminBodySchema,
	userIdParamsSchema,
} from '@/infrastructure/http/schemas/auth-schemas'

type AdminControllerProps = {
	app: FastifyInstance
	getAdminUseCase: GetAdminUseCase
	updateAdminUseCase: UpdateAdminUseCase
	deleteAdminUseCase: DeleteAdminUseCase
}

export class AdminController extends Class<AdminControllerProps> {
	constructor(protected props: AdminControllerProps) {
		super()
	}

	get app() {
		return this.props.app
	}

	registerRoutes() {
		this.app.register(this.getAdminRoute())
		this.app.register(this.updateAdminRoute())
		this.app.register(this.deleteAdminRoute())
	}

	private getAdminRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: userIdParamsSchema,
				response: {
					200: adminResponseSchema,
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().get('/api/v1/admins/:id', {
				schema: {
					tags: ['Admins'],
					summary: 'Get an admin by ID',
					...config,
				},
				onRequest: [roleGuard('ADMIN')],
				handler: async (req, reply) => {
					const result = await this.props.getAdminUseCase.execute({
						adminId: req.params.id,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.send(this.serialize(result.value.admin))
				},
			})
		})
	}

	private updateAdminRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: userIdParamsSchema,
				body: updateAdminBodySchema,
				response: {
					200: adminResponseSchema,
					400: errorEnvelopeSchema,
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().put('/api/v1/admins/:id', {
				schema: {
					tags: ['Admins'],
					summary: 'Update an admin',
					...config,
				},
				onRequest: [roleGuard('ADMIN')],
				handler: async (req, reply) => {
					const result = await this.props.updateAdminUseCase.execute({
						adminId: req.params.id,
						...req.body,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.send(this.serialize(result.value.admin))
				},
			})
		})
	}

	private deleteAdminRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: userIdParamsSchema,
				response: {
					204: {},
					404: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().delete('/api/v1/admins/:id', {
				schema: {
					tags: ['Admins'],
					summary: 'Delete an admin',
					...config,
				},
				onRequest: [roleGuard('ADMIN')],
				handler: async (req, reply) => {
					const result = await this.props.deleteAdminUseCase.execute({
						adminId: req.params.id,
					})

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					return reply.status(204).send()
				},
			})
		})
	}

	private serialize(admin: Admin) {
		return {
			id: String(admin.id),
			name: admin.name,
			email: admin.email.value,
			phone: admin.phone.value,
			deletedAt: admin.deletedAt?.toISOString() ?? null,
		}
	}
}
