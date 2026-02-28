import {
	DefaultIncrementalIdGenerator,
	UUIDV4Generator,
	UUIDV7Generator,
} from '@repo/core'
import { SystemConfigService } from '@repo/system-settings-manager'
import { asFunction } from 'awilix'
import { container } from './container'

container.register({
	systemConfigService: asFunction(() => new SystemConfigService()).singleton(),
	idGeneratorV4: asFunction(() => new UUIDV4Generator()).singleton(),
	idGeneratorV7: asFunction(() => new UUIDV7Generator()).singleton(),
	incrementalIdGenerator: asFunction(
		() => new DefaultIncrementalIdGenerator()
	).singleton(),
})
