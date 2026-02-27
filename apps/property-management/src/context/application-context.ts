import { IdGenerator, IncrementalIdGenerator, Currency } from '@repo/core'
import { ContextManager } from './context-manager'
import { AuthenticatedUser } from './user'

export type ApplicationContext = {
	currentCurrency: Currency
	requestId: string
	user: AuthenticatedUser
	timestamp: Date
	idGenerator: {
		V4: IdGenerator
		V7: IdGenerator
		Incremental: IncrementalIdGenerator
	}
}

export const appContext = new ContextManager<ApplicationContext>()
