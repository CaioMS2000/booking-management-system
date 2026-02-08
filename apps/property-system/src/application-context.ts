import { ContextManager } from './context/context-manager'
import { Currency } from './domain'

export type ApplicationContext = {
	currentCurrency: Currency
	requestId: string
	userId?: string
	timestamp: Date
}

export const appContext = new ContextManager<ApplicationContext>()
