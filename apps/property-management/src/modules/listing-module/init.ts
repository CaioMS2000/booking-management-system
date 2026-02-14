import { CommandBus } from './application/command-bus'
import { QueryBus } from './application/query-bus'
import { LISTING_MODULE_TOKENS } from './tokens'

container.registerSingleton(LISTING_MODULE_TOKENS.QueryBus, QueryBus)
container.registerSingleton(LISTING_MODULE_TOKENS.CommandBus, CommandBus)
