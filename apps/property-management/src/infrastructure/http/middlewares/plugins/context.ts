import type { FastifyInstance, FastifyRequest } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import { appContext } from '@/context/application-context'
import { AppError } from '../../errors'
import { verifyJwt } from '../../jwt/verify-jwt'
import { authenticatedUserSchema } from '@/context/user'
import { Currency } from '@repo/core'
import { APP_TOKENS } from '@/tokens'

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

const PUBLIC_PREFIXES = ['/docs', '/health', '/openapi.json']

export const contextPlugin = fastifyPlugin(async (app: FastifyInstance) => {
	app.addHook('onRequest', async req => {
		if (PUBLIC_PREFIXES.some(p => req.url.startsWith(p))) return

		const token = extractToken(req)
		const payload = token ? await verifyJwt(token) : null

		if (!payload) {
			throw AppError.unauthenticated(
				'Token inválido ou ausente.',
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

		const IdGeneratorV4 = container.resolve(APP_TOKENS.IdGeneratorV4)
		const IdGeneratorV7 = container.resolve(APP_TOKENS.IdGeneratorV7)
		const IncrementalIdGenerator = container.resolve(
			APP_TOKENS.IncrementalIdGenerator
		)
		appContext.enterWith({
			currentCurrency: extractCurrency(req),
			requestId: req.id,
			user: parsed.data,
			timestamp: new Date(),
			idGenerator: {
				V4: IdGeneratorV4,
				V7: IdGeneratorV7,
				Incremental: IncrementalIdGenerator,
			},
		})
	})
})
