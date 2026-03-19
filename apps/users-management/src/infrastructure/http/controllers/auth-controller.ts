import { Class } from '@repo/core'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { LoginUseCase } from '@/application/use-cases/auth/login-use-case'
import type { LogoutUseCase } from '@/application/use-cases/auth/logout-use-case'
import type { RefreshTokenUseCase } from '@/application/use-cases/auth/refresh-token-use-case'
import type { RegisterUseCase } from '@/application/use-cases/auth/register-use-case'
import type { SetPasswordUseCase } from '@/application/use-cases/set-password-use-case'
import { getAuthenticatedUser } from '@/context/get-authenticated-user'
import { authGuard } from '@/infrastructure/http/middlewares/auth-guard'
import { getJWKS } from '@/infrastructure/auth/keys'
import type { RouteConfig } from '@/infrastructure/http/@types/routes'
import { mapDomainErrorToAppError } from '@/infrastructure/http/domain-error-mapper'
import { errorEnvelopeSchema } from '@/infrastructure/http/errors'
import {
	authResponseSchema,
	loginBodySchema,
	refreshResponseSchema,
	registerBodySchema,
	setPasswordBodySchema,
} from '@/infrastructure/http/schemas/auth-schemas'

type AuthControllerProps = {
	app: FastifyInstance
	registerUseCase: RegisterUseCase
	loginUseCase: LoginUseCase
	refreshTokenUseCase: RefreshTokenUseCase
	logoutUseCase: LogoutUseCase
	setPasswordUseCase: SetPasswordUseCase
}

export class AuthController extends Class<AuthControllerProps> {
	constructor(protected props: AuthControllerProps) {
		super()
	}

	get app() {
		return this.props.app
	}

	registerRoutes() {
		this.app.register(this.registerRoute())
		this.app.register(this.loginRoute())
		this.app.register(this.refreshRoute())
		this.app.register(this.logoutRoute())
		this.app.register(this.jwksRoute())
		this.app.register(this.setPasswordRoute())
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

	private clearRefreshCookie(reply: FastifyReply) {
		reply.clearCookie('refresh_token', {
			path: '/api/v1/auth/refresh',
		})
	}

	private registerRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				body: registerBodySchema,
				response: {
					201: authResponseSchema,
					409: errorEnvelopeSchema,
					422: errorEnvelopeSchema,
					429: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().post('/api/v1/auth/register', {
				config: {
					rateLimit: { max: 3, timeWindow: '1 minute' },
				},
				schema: {
					tags: ['Auth'],
					summary: 'Register a new user',
					...config,
				},
				handler: async (req, reply) => {
					const result = await this.props.registerUseCase.execute(req.body)

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					this.setRefreshCookie(reply, result.value.refreshToken)

					return reply.status(201).send({
						accessToken: result.value.accessToken,
						user: result.value.user,
					})
				},
			})
		})
	}

	private loginRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				body: loginBodySchema,
				response: {
					200: authResponseSchema,
					401: errorEnvelopeSchema,
					429: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().post('/api/v1/auth/login', {
				config: {
					rateLimit: { max: 5, timeWindow: '1 minute' },
				},
				schema: {
					tags: ['Auth'],
					summary: 'Login with email and password',
					...config,
				},
				handler: async (req, reply) => {
					const result = await this.props.loginUseCase.execute(req.body)

					if (result.isFailure()) {
						throw mapDomainErrorToAppError(result.value)
					}

					this.setRefreshCookie(reply, result.value.refreshToken)

					return reply.send({
						accessToken: result.value.accessToken,
						user: result.value.user,
					})
				},
			})
		})
	}

	private refreshRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				response: {
					200: refreshResponseSchema,
					401: errorEnvelopeSchema,
					429: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().post('/api/v1/auth/refresh', {
				config: {
					rateLimit: { max: 10, timeWindow: '1 minute' },
				},
				schema: {
					tags: ['Auth'],
					summary: 'Refresh access token using refresh token cookie',
					...config,
				},
				handler: async (req, reply) => {
					const refreshToken = req.cookies.refresh_token

					if (!refreshToken) {
						const { AppError } = await import('@/infrastructure/http/errors')
						throw AppError.unauthenticated(
							'Refresh token ausente.',
							'Envie o refresh token via cookie.'
						)
					}

					const result = await this.props.refreshTokenUseCase.execute({
						refreshToken,
					})

					if (result.isFailure()) {
						this.clearRefreshCookie(reply)
						throw mapDomainErrorToAppError(result.value)
					}

					this.setRefreshCookie(reply, result.value.refreshToken)

					return reply.send({
						accessToken: result.value.accessToken,
					})
				},
			})
		})
	}

	private logoutRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				response: {
					204: {},
				},
			} satisfies RouteConfig

			app.withTypeProvider<ZodTypeProvider>().post('/api/v1/auth/logout', {
				schema: {
					tags: ['Auth'],
					summary: 'Logout and revoke refresh token',
					...config,
				},
				handler: async (req, reply) => {
					const refreshToken = req.cookies.refresh_token

					if (refreshToken) {
						await this.props.logoutUseCase.execute({ refreshToken })
					}

					this.clearRefreshCookie(reply)
					return reply.status(204).send()
				},
			})
		})
	}

	private setPasswordRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			const config = {
				body: setPasswordBodySchema,
				response: {
					204: {},
					409: errorEnvelopeSchema,
					429: errorEnvelopeSchema,
				},
			} satisfies RouteConfig

			app
				.withTypeProvider<ZodTypeProvider>()
				.post('/api/v1/auth/set-password', {
					onRequest: [authGuard],
					config: {
						rateLimit: { max: 3, timeWindow: '1 minute' },
					},
					schema: {
						tags: ['Auth'],
						summary: 'Set password for social-login users',
						...config,
					},
					handler: async (req, reply) => {
						const user = getAuthenticatedUser()
						const result = await this.props.setPasswordUseCase.execute({
							userId: user.id,
							password: req.body.password,
						})

						if (result.isFailure()) {
							throw mapDomainErrorToAppError(result.value)
						}

						return reply.status(204).send()
					},
				})
		})
	}

	private jwksRoute() {
		return fastifyPlugin(async (app: FastifyInstance) => {
			app.get('/.well-known/jwks.json', {
				schema: {
					tags: ['Auth'],
					summary: 'JSON Web Key Set (public keys)',
				},
				handler: async (_req, reply) => {
					const jwks = await getJWKS()
					return reply.send(jwks)
				},
			})
		})
	}
}
