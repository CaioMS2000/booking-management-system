import 'reflect-metadata'
import { SystemConfigService } from '@repo/system-settings-manager'
import {
	UUIDV4Generator,
	UUIDV7Generator,
	DefaultIncrementalIdGenerator,
} from '@repo/core'
import { APP_TOKENS } from './tokens'

container.registerSingleton(APP_TOKENS.SystemConfigService, SystemConfigService)
container.registerSingleton(APP_TOKENS.IdGeneratorV4, UUIDV4Generator)
container.registerSingleton(APP_TOKENS.IdGeneratorV7, UUIDV7Generator)
container.registerSingleton(
	APP_TOKENS.IncrementalIdGenerator,
	DefaultIncrementalIdGenerator
)
