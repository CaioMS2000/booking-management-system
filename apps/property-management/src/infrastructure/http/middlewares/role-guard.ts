import type { FastifyInstance } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import { appContext } from '@/context/application-context'
import type { AuthenticatedUserRoles } from '@/context/user'
import { AppError } from '../errors'

export function roleGuard(...roles: AuthenticatedUserRoles[]) {
	return fastifyPlugin(async (app: FastifyInstance) => {
		app.addHook('onRequest', async () => {
			const user = appContext.get().user
			if (!roles.includes(user.role)) {
				throw AppError.forbidden(
					'Usuário não tem permissão para acessar este recurso.'
				)
			}
		})
	})
}
