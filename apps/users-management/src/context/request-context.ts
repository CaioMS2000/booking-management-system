import { Currency } from '@repo/core'
import { ContextManager } from './context-manager'
import { AuthenticatedUser } from './user'

export type RequestContext = {
	currentCurrency: Currency
	requestId: string
	user: AuthenticatedUser | null
	timestamp: Date
}

export const requestContext = new ContextManager<RequestContext>()
