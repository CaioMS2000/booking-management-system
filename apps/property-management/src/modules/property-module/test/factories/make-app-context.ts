import { ApplicationContext } from '@/context/application-context'
import { FakeIdGenerator } from '../fake-id-generator'
import { FakeIncrementalIdGenerator } from '../fake-incremental-id-generator'

export function makeAppContext(
	overrides?: Partial<ApplicationContext>
): ApplicationContext {
	return {
		currentCurrency: 'BRL',
		requestId: 'test-request',
		user: {
			id: 'test-user-id',
			name: 'Test User',
			email: 'test@example.com',
			role: 'HOST',
		},
		timestamp: new Date(),
		idGenerator: {
			V4: new FakeIdGenerator(),
			V7: new FakeIdGenerator(),
			Incremental: new FakeIncrementalIdGenerator(),
		},
		...overrides,
	}
}
