import { AppError } from '@/infrastructure/http/errors'
import {
	HostNotFoundError,
	InvalidEmailError,
	InvalidPhoneError,
	ListingNotFoundError,
	ListingNotOwnedByHostError,
	PropertyHasActiveListingsError,
	PropertyNotFoundError,
	PropertyNotOwnedByHostError,
	PropertyModuleApplicationError,
} from '@/modules/property-module/application/@errors'

export function mapDomainErrorToAppError(
	error: PropertyModuleApplicationError
): AppError {
	if (error instanceof HostNotFoundError)
		return AppError.notFound('NOT_FOUND', 'Host não encontrado.')

	if (error instanceof PropertyNotFoundError)
		return AppError.notFound('NOT_FOUND', 'Propriedade não encontrada.')

	if (error instanceof ListingNotFoundError)
		return AppError.notFound('NOT_FOUND', 'Anúncio não encontrado.')

	if (error instanceof PropertyNotOwnedByHostError)
		return AppError.forbidden('Você não é o dono desta propriedade.')

	if (error instanceof ListingNotOwnedByHostError)
		return AppError.forbidden('Você não é o dono deste anúncio.')

	if (error instanceof PropertyHasActiveListingsError)
		return AppError.conflict('CONFLICT', 'Propriedade possui anúncios ativos.')

	if (error instanceof InvalidEmailError)
		return AppError.badRequest('BAD_REQUEST', 'Email inválido.')

	if (error instanceof InvalidPhoneError)
		return AppError.badRequest('BAD_REQUEST', 'Telefone inválido.')

	return AppError.internal()
}
