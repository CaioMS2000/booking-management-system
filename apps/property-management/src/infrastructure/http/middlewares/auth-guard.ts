import type { FastifyReply, FastifyRequest } from 'fastify'
import { requestContext } from '@/context/request-context'
import { AppError } from '../errors'

export async function authGuard(
	_request: FastifyRequest,
	_reply: FastifyReply
) {
	const user = requestContext.get().user
	if (!user) {
		throw AppError.unauthenticated(
			'Token ausente.',
			'Envie um JWT válido no header Authorization.'
		)
	}
}
