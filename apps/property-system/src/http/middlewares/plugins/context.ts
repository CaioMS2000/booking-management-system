import { fromNodeHeaders } from 'better-auth/node'
import type { FastifyInstance } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import { ApplicationContext, appContext } from '@/application-context'
import { Currency } from '@/domain'
import { AppError } from '../../errors'

export const contextPlugin = fastifyPlugin(async (app: FastifyInstance) => {
	app.addHook('preHandler', async req => {
		const headers = fromNodeHeaders(req.headers)
		const currentCurrency: Currency = 'BRL' // some way using 'req' information to get current currency
		const context: ApplicationContext = {
			currentCurrency,
			requestId: req.id,
			timestamp: new Date(),
		}

		try {
			const sessionResult = await req.auth.api.getSession({ headers })

			if (!sessionResult?.user) {
				throw AppError.unauthenticated(
					'Sessão inválida ou expirada.',
					'Faça login novamente.'
				)
			}

			appContext.run(context, async () => {})
		} catch (error) {
			if (error instanceof AppError) throw error
			req.log.debug({ err: error }, 'Failed to resolve session via Better Auth')
			throw AppError.unauthenticated(
				'Sessão inválida ou expirada.',
				'Faça login novamente.'
			)
		}
	})
})
