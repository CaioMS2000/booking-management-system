import { UniqueId } from '@repo/core'

export abstract class Query<TResult> {
	readonly __resultType?: TResult
	protected constructor(public readonly id: UniqueId) {}
}

export type QueryResult<T> = T extends Query<infer R> ? R : never

export abstract class QueryHandler<TQuery extends Query<any>> {
	abstract execute(query: TQuery): Promise<QueryResult<TQuery>>
}
