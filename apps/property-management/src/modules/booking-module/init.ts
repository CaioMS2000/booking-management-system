import { EventBus } from '@repo/core'
import { BOOKING_MODULE_TOKENS } from './tokens'

// container.registerSingleton(PROPERTY_MODULE_TOKENS.QueryBus, QueryBus)
// container.registerSingleton(PROPERTY_MODULE_TOKENS.CommandBus, CommandBus)
container.registerSingleton(BOOKING_MODULE_TOKENS.EventBus, EventBus)
