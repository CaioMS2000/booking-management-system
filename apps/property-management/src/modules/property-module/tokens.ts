import { QueryBus } from './application/query-bus'
import { CommandBus } from './application/command-bus'

export const PROPERTY_MODULE_TOKENS = {
	QueryBus: Symbol('QueryBus') as InjectionToken<QueryBus>,
	CommandBus: Symbol('CommandBus') as InjectionToken<CommandBus>,
} as const
