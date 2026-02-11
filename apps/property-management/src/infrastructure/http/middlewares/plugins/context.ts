import type { FastifyInstance, FastifyRequest } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import { appContext } from '@/modules/property-module/application-context'
import { Currency } from '@/modules/property-module/domain'
import { AppError } from '../../errors'
import { verifyJwt } from '../../jwt/verify-jwt'

function extractToken(req: FastifyRequest): string | null {
	const auth = req.headers.authorization
	if (auth?.startsWith('Bearer ')) {
		return auth.slice(7)
	}
	return null
}

function extractCurrency(req: FastifyRequest): Currency {
	const header = req.headers['x-currency']
	if (header === 'USD' || header === 'BRL') {
		return header
	}

	const query = (req.query as Record<string, unknown>)?.currency
	if (query === 'USD' || query === 'BRL') {
		return query
	}

	return 'BRL'
}

export const contextPlugin = fastifyPlugin(async (app: FastifyInstance) => {
	app.addHook('onRequest', async req => {
		const token = extractToken(req)
		const payload = token ? await verifyJwt(token) : null

		if (!payload) {
			throw AppError.unauthenticated(
				'Token inválido ou ausente.',
				'Envie um JWT válido no header Authorization.'
			)
		}

		const IdGeneratorV4 = container.resolve(TOKENS.IdGeneratorV4)
		const IdGeneratorV7 = container.resolve(TOKENS.IdGeneratorV7)
		appContext.enterWith({
			currentCurrency: extractCurrency(req),
			requestId: req.id,
			userId: payload.sub,
			timestamp: new Date(),
			idGenerator: {
				V4: IdGeneratorV4,
				V7: IdGeneratorV7,
			},
		})
	})
})
