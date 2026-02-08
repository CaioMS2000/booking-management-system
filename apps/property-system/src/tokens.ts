import { SystemConfigService } from '@repo/system-settings-manager'

export const TOKENS = {
	SystemConfigService: Symbol(
		'SystemConfigService'
	) as InjectionToken<SystemConfigService>,
} as const
