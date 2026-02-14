import { CommandBus } from './application/command-bus'
import { QueryBus } from './application/query-bus'

export const LISTING_MODULE_TOKENS = {
	QueryBus: Symbol('QueryBus') as InjectionToken<QueryBus>,
	CommandBus: Symbol('CommandBus') as InjectionToken<CommandBus>,
} as const
