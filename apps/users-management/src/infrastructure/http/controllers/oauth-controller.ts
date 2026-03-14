import { Class } from '@repo/core'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { OAuthStateRepository } from '@/application/repositories/oauth-state-repository'
import type { SocialLoginUseCase } from '@/application/use-cases/social-login-use-case'
import type {
	OAuthProvider,
	OAuthProviderService,
} from '@/infrastructure/auth/oauth-provider-service'
import { env } from '@/config/env'
import type { RouteConfig } from '@/infrastructure/http/@types/routes'
import {
	oauthCallbackQuerySchema,
	oauthProviderParamSchema,
} from '@/infrastructure/http/schemas/oauth-schemas'

const OAUTH_STATE_TTL_SECONDS = 600 // 10 minutes

type OAuthControllerProps = {
	app: FastifyInstance
	oauthProviderService: OAuthProviderService
	oauthStateRepository: OAuthStateRepository
	socialLoginUseCase: SocialLoginUseCase
}

export class OAuthController extends Class<OAuthControllerProps> {
	constructor(protected props: OAuthControllerProps) {
		super()
	}

	get app() {
		return this.props.app
	}

	registerRoutes() {
		this.app.register(this.authorizeRoute())
		this.app.register(this.callbackRoute())
	}

	private setRefreshCookie(reply: FastifyReply, token: string) {
		reply.setCookie('refresh_token', token, {
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			path: '/api/v1/auth/refresh',
			maxAge: 30 * 24 * 60 * 60,
		})
	}

	private redirectToFrontend(
		reply: FastifyReply,
		params: Record<string, string>
	) {
		const url = new URL(env.OAUTH_FRONTEND_CALLBACK_URL)
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value)
		}
		return reply.redirect(url.toString())
	}

	private authorizeRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: oauthProviderParamSchema,
			} satisfies RouteConfig

			app
				.withTypeProvider<ZodTypeProvider>()
				.get('/api/v1/auth/oauth/:provider', {
					config: {
						rateLimit: { max: 10, timeWindow: '1 minute' },
					},
					schema: {
						tags: ['OAuth'],
						summary: 'Initiate OAuth2 login flow',
						...config,
					},
					handler: async (req, reply) => {
						const { provider } = req.params
						const { url, state, codeVerifier } =
							this.props.oauthProviderService.createAuthorizationURL(
								provider as OAuthProvider
							)

						await this.props.oauthStateRepository.save(
							state,
							{ codeVerifier, provider },
							OAUTH_STATE_TTL_SECONDS
						)

						return reply.redirect(url.toString())
					},
				})
		})
	}

	private callbackRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				params: oauthProviderParamSchema,
				querystring: oauthCallbackQuerySchema,
			} satisfies RouteConfig

			app
				.withTypeProvider<ZodTypeProvider>()
				.get('/api/v1/auth/oauth/:provider/callback', {
					config: {
						rateLimit: { max: 10, timeWindow: '1 minute' },
					},
					schema: {
						tags: ['OAuth'],
						summary: 'Handle OAuth2 callback from provider',
						...config,
					},
					handler: async (req, reply) => {
						const { provider } = req.params
						const { code, state, error } = req.query

						if (error) {
							return this.redirectToFrontend(reply, {
								error: 'oauth_denied',
							})
						}

						const stateData =
							await this.props.oauthStateRepository.findAndDelete(state)

						if (!stateData) {
							return this.redirectToFrontend(reply, {
								error: 'invalid_state',
							})
						}

						try {
							const profile =
								await this.props.oauthProviderService.validateCodeAndGetProfile(
									provider as OAuthProvider,
									code,
									stateData.codeVerifier
								)

							const result = await this.props.socialLoginUseCase.execute({
								provider,
								providerAccountId: profile.providerAccountId,
								email: profile.email,
								name: profile.name,
							})

							if (result.isFailure()) {
								return this.redirectToFrontend(reply, {
									error: 'login_failed',
								})
							}

							this.setRefreshCookie(reply, result.value.refreshToken)

							return this.redirectToFrontend(reply, {
								accessToken: result.value.accessToken,
								isNewUser: String(result.value.isNewUser),
							})
						} catch {
							return this.redirectToFrontend(reply, {
								error: 'provider_error',
							})
						}
					},
				})
		})
	}
}
