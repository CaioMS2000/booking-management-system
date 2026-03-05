import type { AuthenticatedUser } from './user'
import { appContext } from './application-context'
import { AppError } from '@/infrastructure/http/errors'

export function getAuthenticatedUser(): AuthenticatedUser {
	const user = appContext.get().user
	if (!user) {
		throw AppError.unauthenticated(
			'Token ausente.',
			'Envie um JWT válido no header Authorization.'
		)
	}
	return user
}
