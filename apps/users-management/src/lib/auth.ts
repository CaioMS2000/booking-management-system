import { betterAuth, BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { openAPI } from 'better-auth/plugins'
import { localization } from 'better-auth-localization'
import { eq } from 'drizzle-orm'
import { env } from '@/config/env'
import {
	SystemSettingKey,
	SystemConfigService,
} from '@repo/system-settings-manager'
import {
	authAccounts,
	authSessions,
	authUsers,
	authVerifications,
	users,
} from '@/infrastructure/database/schema'
import { createLogger } from '@repo/core'
import { database } from '@/lib/drizzle'

const authLogger = createLogger({ component: 'better-auth' })

// Lazy reference to SystemConfigService (populated after container.init())
let configManagerRef: SystemConfigService | null = null

function setConfigManager(cm: SystemConfigService) {
	configManagerRef = cm
}

const baseUrlString = process.env.APP_BASE_URL ?? `http://localhost:${env.PORT}`
const baseUrl = new URL(baseUrlString)
baseUrl.pathname = '/auth'

const DEFAULT_TRUSTED_ORIGINS = ['http://localhost:5173']

const options: BetterAuthOptions = {
	baseURL: baseUrl.toString(),
	trustedOrigins: request => {
		// request is undefined during initialization and auth.api calls
		if (!request || !configManagerRef) {
			return DEFAULT_TRUSTED_ORIGINS
		}
		const corsConfig = configManagerRef.getValue(SystemSettingKey.CORS)
		return corsConfig?.origins ?? DEFAULT_TRUSTED_ORIGINS
	},
	advanced: {
		useSecureCookies: env.NODE_ENV === 'production',
		defaultCookieAttributes: {
			sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
			secure: env.NODE_ENV === 'production',
		},
	},
	database: drizzleAdapter(database, {
		provider: 'pg',
		schema: {
			user: authUsers,
			session: authSessions,
			account: authAccounts,
			verification: authVerifications,
		},
	}),
	user: {
		additionalFields: {
			phone: {
				type: 'string',
				required: true,
				input: true,
			},
		},
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		minPasswordLength: 3,
	},
	plugins: [
		openAPI({
			disableDefaultReference: true,
		}),
		localization({
			defaultLocale: 'pt-BR',
		}),
	],
}
export const auth = betterAuth({
	...options,
	logger: {
		disabled: false,
		level: 'debug',
		log: (level, message, ...args) => {
			const extra = args.length > 0 ? { details: args } : undefined
			switch (level) {
				case 'debug':
					authLogger.debug(message, extra)
					break
				case 'info':
					authLogger.info(message, extra)
					break
				case 'warn':
					authLogger.warn(message, extra)
					break
				case 'error':
					authLogger.error(message, extra)
					break
				default:
					authLogger.info(message, extra)
			}
		},
	},
	databaseHooks: {
		user: {
			create: {
				after: async user => {
					const unsafeUser: any = user

					if (!unsafeUser.phone) {
						throw new Error('User must have a phone number')
					}

					try {
						await database.insert(users).values({
							authUserId: user.id,
							name: user.name,
							email: user.email,
							phone: unsafeUser.phone,
						})
					} catch (err) {
						await database
							.delete(authUsers)
							.where(eq(authUsers.id, user.id))
							.catch(rollbackErr => {
								authLogger.error(
									"Defensive rollback failed, probably an orphan 'auth_users' row was left behind.",
									{ err: rollbackErr }
								)
							})
						throw err
					}
				},
			},
		},
	},
})

export type Auth = typeof auth
export const authLib = {
	instance: auth,
	setConfigManager,
}
