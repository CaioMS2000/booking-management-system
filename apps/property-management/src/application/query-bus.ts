import { QueryHandlerNotFoundError } from './@errors'
import { Query, QueryResult, QueryHandler } from './query'

type QueryClass<T extends Query<any>> = abstract new (...args: any[]) => T

export class QueryBus {
	private handlers = new Map<QueryClass<any>, QueryHandler<any>>()

	register<TQuery extends Query<any>>(
		queryClass: QueryClass<TQuery>,
		handler: QueryHandler<TQuery>
	) {
		this.handlers.set(queryClass, handler)
	}

	async execute<TQuery extends Query<any>>(
		query: TQuery
	): Promise<QueryResult<TQuery>> {
		const handler = this.handlers.get(
			query.constructor as QueryClass<TQuery>
		) as QueryHandler<TQuery> | undefined

		if (!handler) {
			throw new QueryHandlerNotFoundError(
				`Handler for ${query.constructor.name} not found`
			)
		}

		return await handler.execute(query)
	}
}
