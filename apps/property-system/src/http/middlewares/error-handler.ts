import { AppError, toErrorEnvelope } from '@/http/errors'
import { logger } from '@/logging/logger'
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

function serializeError(err: any): Record<string, unknown> {
	if (!err || typeof err !== 'object') return { message: String(err) }
	const rawMessage = (err as any).message
	const message =
		typeof rawMessage === 'string'
			? rawMessage
			: (JSON.stringify(rawMessage) ?? String(rawMessage))
	const base: Record<string, unknown> = {
		name: (err as any).name,
		message,
		stack: (err as any).stack,
	}
	const code = (err as any).code
	const statusCode = (err as any).statusCode
	if (code) base.code = code
	if (statusCode) base.statusCode = statusCode
	const cause = (err as any).cause
	if (cause) base.cause = serializeError(cause)
	return base
}

export function errorHandler(
	error: FastifyError,
	request: FastifyRequest,
	reply: FastifyReply
): void {
	const rid = (request as any)._reqId as string | undefined
	const hdrs = { ...request.headers }
	if ((hdrs as any).authorization) (hdrs as any).authorization = '***'
	if ((hdrs as any).cookie) (hdrs as any).cookie = '***'

	// Log de debug para diagnóstico de erros [object Object]
	logger.debug('error_handler_entry', {
		component: 'http',
		requestId: rid,
		errorName: error?.name,
		errorConstructorName: error?.constructor?.name,
		errorPrototypeName: Object.getPrototypeOf(error)?.constructor?.name,
		rawMessage: (error as any)?.message,
		rawMessageType: typeof (error as any)?.message,
		isAppError: error instanceof AppError,
		isZodError: error instanceof ZodError,
		statusCode: (error as any)?.statusCode,
	})

	logger.error('http_error', {
		component: 'http',
		requestId: rid,
		method: request.method,
		url: request.url,
		headers: hdrs,
		params: request.params as any,
		query: request.query as any,
		err: serializeError(error),
	})

	// AppError: envelope padronizado
	if (error instanceof AppError) {
		reply.status(error.statusCode).send(toErrorEnvelope(error))
		return
	}

	// ZodError -> 422
	if (error instanceof ZodError) {
		const appErr = AppError.validation(error.issues)
		reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
		return
	}

	// Mapeamento mínimo por statusCode quando não for AppError
	const sc = (error as any)?.statusCode as number | undefined
	if (sc === 401) {
		const appErr = AppError.unauthenticated('Sessão expirada ou ausente.')
		reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
		return
	}
	if (sc === 403) {
		const appErr = AppError.forbidden()
		reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
		return
	}
	if (sc === 404) {
		const appErr = AppError.notFound()
		reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
		return
	}
	if (sc === 409) {
		const appErr = AppError.conflict()
		reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
		return
	}
	if (sc === 422) {
		const appErr = AppError.validation()
		reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
		return
	}
	if (sc === 429) {
		const appErr = AppError.rateLimited()
		reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
		return
	}

	// Fallback 500
	const appErr = AppError.internal()
	reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
}
