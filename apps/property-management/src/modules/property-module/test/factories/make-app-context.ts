import { RequestContext } from '@/context/request-context'

export function makeAppContext(
	overrides?: Partial<RequestContext>
): RequestContext {
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
		...overrides,
	}
}
