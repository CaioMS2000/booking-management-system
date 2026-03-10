import {
	AdminNotFoundError,
	EmailAlreadyRegisteredError,
	GuestNotFoundError,
	HostNotFoundError,
	InvalidCredentialsError,
	InvalidEmailError,
	InvalidPhoneError,
	InvalidRefreshTokenError,
	TokenReplayDetectedError,
	UsersModuleApplicationError,
} from '@/application/@errors'
import { AppError } from './errors'

export function mapDomainErrorToAppError(
	error: UsersModuleApplicationError
): AppError {
	if (error instanceof EmailAlreadyRegisteredError)
		return AppError.conflict('EMAIL_ALREADY_REGISTERED', 'Email já cadastrado.')

	if (error instanceof InvalidCredentialsError)
		return AppError.authInvalidCredentials()

	if (error instanceof InvalidRefreshTokenError)
		return AppError.unauthenticated(
			'Refresh token inválido ou expirado.',
			'Faça login novamente.'
		)

	if (error instanceof TokenReplayDetectedError)
		return AppError.unauthenticated(
			'Possível reutilização de token detectada. Todos os tokens foram revogados.',
			'Faça login novamente.'
		)

	if (error instanceof HostNotFoundError)
		return AppError.notFound('NOT_FOUND', 'Host não encontrado.')

	if (error instanceof GuestNotFoundError)
		return AppError.notFound('NOT_FOUND', 'Guest não encontrado.')

	if (error instanceof AdminNotFoundError)
		return AppError.notFound('NOT_FOUND', 'Admin não encontrado.')

	if (error instanceof InvalidEmailError)
		return AppError.badRequest('BAD_REQUEST', 'Email inválido.')

	if (error instanceof InvalidPhoneError)
		return AppError.badRequest('BAD_REQUEST', 'Telefone inválido.')

	return AppError.internal()
}
