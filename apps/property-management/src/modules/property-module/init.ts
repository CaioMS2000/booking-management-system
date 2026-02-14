import { CommandBus } from './application/command-bus'
import { QueryBus } from './application/query-bus'
import { PROPERTY_MODULE_TOKENS } from './tokens'

container.registerSingleton(PROPERTY_MODULE_TOKENS.QueryBus, QueryBus)
container.registerSingleton(PROPERTY_MODULE_TOKENS.CommandBus, CommandBus)
