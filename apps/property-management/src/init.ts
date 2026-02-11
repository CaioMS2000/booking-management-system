import 'reflect-metadata'
import { SystemConfigService } from '@repo/system-settings-manager'
import { UUIDV4Generator, UUIDV7Generator } from '@repo/core'

container.registerSingleton(TOKENS.SystemConfigService, SystemConfigService)
container.registerSingleton(TOKENS.IdGeneratorV4, UUIDV4Generator)
container.registerSingleton(TOKENS.IdGeneratorV7, UUIDV7Generator)
