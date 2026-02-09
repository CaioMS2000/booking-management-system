import { QueryHandlerNotFoundError } from './@errors'
import { Query, QueryHandler } from './query'

export class QueryBus {
	private handlers: Map<string, QueryHandler<any>> = new Map()

	register<T>(query: Query<T>, handler: QueryHandler<T>) {
		this.handlers.set(query.constructor.name, handler)
	}

	async execute<T>(query: Query<T>): Promise<T> {
		const key = query.constructor.name
		const handler = this.handlers.get(key) as QueryHandler<T> | undefined

		if (!handler) {
			throw new QueryHandlerNotFoundError(`Handler for ${key} not found`)
		}

		return await handler.execute(query)
	}
}
