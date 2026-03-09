import type { FastifyReply, FastifyRequest } from 'fastify'
import { requestContext } from '@/context/request-context'
import type { AuthenticatedUserRoles } from '@/context/user'
import { AppError } from '../errors'

export function roleGuard(...roles: AuthenticatedUserRoles[]) {
	return async (_request: FastifyRequest, _reply: FastifyReply) => {
		const user = requestContext.get().user
		if (!user) {
			throw AppError.unauthenticated(
				'Token ausente.',
				'Envie um JWT válido no header Authorization.'
			)
		}
		if (!roles.includes(user.role)) {
			throw AppError.forbidden(
				'Usuário não tem permissão para acessar este recurso.'
			)
		}
	}
}
