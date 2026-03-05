import type { FastifyReply, FastifyRequest } from 'fastify'
import { appContext } from '@/context/application-context'
import { AppError } from '../errors'

export async function authGuard(
	_request: FastifyRequest,
	_reply: FastifyReply
) {
	const user = appContext.get().user
	if (!user) {
		throw AppError.unauthenticated(
			'Token ausente.',
			'Envie um JWT válido no header Authorization.'
		)
	}
}
