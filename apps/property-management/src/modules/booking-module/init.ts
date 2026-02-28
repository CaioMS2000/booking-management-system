import { EventBus } from '@repo/core'
import { asFunction } from 'awilix'
import { container } from '@/container'

container.register({
	eventBus: asFunction(() => new EventBus()).singleton(),
})
