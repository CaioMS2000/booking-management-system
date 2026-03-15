import { createLogger } from './logger'
import type { FastifyBaseLogger } from 'fastify'

type BaseFields = Record<string, unknown>

function adaptMethod(
	logFn: (msg: string, extra?: BaseFields) => void
): (objOrMsg?: unknown, msg?: string) => void {
	return (objOrMsg?: unknown, msg?: string) => {
		if (typeof objOrMsg === 'string') {
			logFn(objOrMsg)
		} else if (msg) {
			logFn(msg, objOrMsg as BaseFields)
		} else if (objOrMsg && typeof objOrMsg === 'object') {
			const { msg: embeddedMsg, ...rest } = objOrMsg as BaseFields & {
				msg?: string
			}
			logFn(
				(embeddedMsg as string) ?? JSON.stringify(rest),
				embeddedMsg ? rest : undefined
			)
		}
	}
}

function adaptErrorMethod(
	logFn: (msg: string, extra?: BaseFields & { err?: unknown }) => void
): (objOrMsg?: unknown, msg?: string) => void {
	return (objOrMsg?: unknown, msg?: string) => {
		if (typeof objOrMsg === 'string') {
			logFn(objOrMsg)
		} else if (msg) {
			const extra = objOrMsg as BaseFields
			const err = extra?.err ?? extra?.error ?? objOrMsg
			logFn(msg, { ...extra, err })
		} else if (objOrMsg && typeof objOrMsg === 'object') {
			const { msg: embeddedMsg, ...rest } = objOrMsg as BaseFields & {
				msg?: string
			}
			const err = rest?.err ?? rest?.error ?? objOrMsg
			logFn((embeddedMsg as string) ?? 'error', { ...rest, err })
		}
	}
}

export function createFastifyLogger(component = 'Fastify'): FastifyBaseLogger {
	const logger = createLogger({ component })

	const adapted: FastifyBaseLogger = {
		info: adaptMethod(logger.info.bind(logger)) as FastifyBaseLogger['info'],
		error: adaptErrorMethod(
			logger.error.bind(logger)
		) as FastifyBaseLogger['error'],
		warn: adaptMethod(logger.warn.bind(logger)) as FastifyBaseLogger['warn'],
		debug: adaptMethod(logger.debug.bind(logger)) as FastifyBaseLogger['debug'],
		fatal: adaptErrorMethod(
			logger.error.bind(logger)
		) as FastifyBaseLogger['fatal'],
		trace: adaptMethod(logger.debug.bind(logger)) as FastifyBaseLogger['trace'],
		silent: (() => {}) as FastifyBaseLogger['silent'],
		level: 'debug',
		child(bindings: Record<string, unknown>) {
			const childLogger = createLogger({ component, ...bindings })
			const childAdapted = createFastifyLogger(component)
			// Override methods with the child's logger
			childAdapted.info = adaptMethod(
				childLogger.info.bind(childLogger)
			) as FastifyBaseLogger['info']
			childAdapted.error = adaptErrorMethod(
				childLogger.error.bind(childLogger)
			) as FastifyBaseLogger['error']
			childAdapted.warn = adaptMethod(
				childLogger.warn.bind(childLogger)
			) as FastifyBaseLogger['warn']
			childAdapted.debug = adaptMethod(
				childLogger.debug.bind(childLogger)
			) as FastifyBaseLogger['debug']
			childAdapted.fatal = adaptErrorMethod(
				childLogger.error.bind(childLogger)
			) as FastifyBaseLogger['fatal']
			childAdapted.trace = adaptMethod(
				childLogger.debug.bind(childLogger)
			) as FastifyBaseLogger['trace']
			return childAdapted
		},
	}

	return adapted
}
