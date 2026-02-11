import { SystemConfigService } from '@repo/system-settings-manager'
import { IdGenerator } from '@repo/core'

export const TOKENS = {
	SystemConfigService: Symbol(
		'SystemConfigService'
	) as InjectionToken<SystemConfigService>,
	IdGeneratorV4: Symbol('IdGeneratorV4') as InjectionToken<IdGenerator>,
	IdGeneratorV7: Symbol('IdGeneratorV7') as InjectionToken<IdGenerator>,
} as const
