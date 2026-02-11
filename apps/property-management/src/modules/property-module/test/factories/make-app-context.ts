import { ApplicationContext } from '@/modules/property-module/application-context'
import { FakeIdGenerator } from '../fake-id-generator'

export function makeAppContext(
	overrides?: Partial<ApplicationContext>
): ApplicationContext {
	return {
		currentCurrency: 'BRL',
		requestId: 'test-request',
		timestamp: new Date(),
		idGenerator: {
			V4: new FakeIdGenerator(),
			V7: new FakeIdGenerator(),
		},
		...overrides,
	}
}
