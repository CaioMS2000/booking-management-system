import { Currency } from '@repo/core'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import { container } from '@/container'
import { appContext } from '@/context/application-context'
import { authenticatedUserSchema } from '@/context/user'
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
		let user = null

		if (token) {
			const payload = await verifyJwt(token)

			if (!payload) {
				throw AppError.unauthenticated(
					'Token inválido.',
					'Envie um JWT válido no header Authorization.'
				)
			}

			const parsed = authenticatedUserSchema.safeParse({
				id: payload.sub,
				name: payload.name,
				email: payload.email,
				role: payload.role,
			})

			if (!parsed.success) {
				throw AppError.unauthenticated(
					'Token com claims inválidos.',
					'O JWT deve conter sub, name, email e role.'
				)
			}

			user = parsed.data
		}

		const IdGeneratorV4 = container.resolve('idGeneratorV4')
		const IdGeneratorV7 = container.resolve('idGeneratorV7')
		const IncrementalIdGenerator = container.resolve('incrementalIdGenerator')
		appContext.enterWith({
			currentCurrency: extractCurrency(req),
			requestId: req.id,
			user,
			timestamp: new Date(),
			idGenerator: {
				V4: IdGeneratorV4,
				V7: IdGeneratorV7,
				Incremental: IncrementalIdGenerator,
			},
		})
	})
})
