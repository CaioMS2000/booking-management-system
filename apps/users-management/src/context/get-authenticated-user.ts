import type { AuthenticatedUser } from './user'
import { requestContext } from './request-context'
import { AppError } from '@/infrastructure/http/errors'

export function getAuthenticatedUser(): AuthenticatedUser {
	const user = requestContext.get().user
	if (!user) {
		throw AppError.unauthenticated(
			'Token ausente.',
			'Envie um JWT válido no header Authorization.'
		)
	}
	return user
}
