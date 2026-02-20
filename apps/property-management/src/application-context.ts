import { IdGenerator, IncrementalIdGenerator, Currency } from '@repo/core'
import { ContextManager } from './context/context-manager'

export type ApplicationContext = {
	currentCurrency: Currency
	requestId: string
	userId?: string
	timestamp: Date
	idGenerator: {
		V4: IdGenerator
		V7: IdGenerator
		Incremental: IncrementalIdGenerator
	}
}

export const appContext = new ContextManager<ApplicationContext>()
