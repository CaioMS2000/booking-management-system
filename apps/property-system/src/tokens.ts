import type { Auth } from 'better-auth'
import { SystemConfigService } from '@repo/system-settings-manager'

export const TOKENS = {
	Auth: Symbol('Auth') as InjectionToken<Auth>,
	SystemConfigService: Symbol(
		'SystemConfigService'
	) as InjectionToken<SystemConfigService>,
} as const
