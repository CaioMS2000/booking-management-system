import { SystemConfigService } from '@repo/system-settings-manager'
import { IdGenerator, IncrementalIdGenerator } from '@repo/core'

export const APP_TOKENS = {
	SystemConfigService: Symbol(
		'SystemConfigService'
	) as InjectionToken<SystemConfigService>,
	IdGeneratorV4: Symbol('IdGeneratorV4') as InjectionToken<IdGenerator>,
	IdGeneratorV7: Symbol('IdGeneratorV7') as InjectionToken<IdGenerator>,
	IncrementalIdGenerator: Symbol(
		'IncrementalIdGenerator'
	) as InjectionToken<IncrementalIdGenerator>,
} as const
