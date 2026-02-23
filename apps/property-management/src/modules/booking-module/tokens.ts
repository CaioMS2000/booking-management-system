import { EventBus } from '@repo/core'

export const BOOKING_MODULE_TOKENS = {
	// IdGeneratorV4: Symbol('IdGeneratorV4') as InjectionToken<IdGenerator>,
	EventBus: Symbol('EventBus') as InjectionToken<EventBus>,
} as const
