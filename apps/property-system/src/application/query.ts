import { UniqueEntityID } from '@repo/core'

export abstract class Query<ResultType> {
	readonly resultType?: ResultType
	protected constructor(public readonly id: UniqueEntityID) {}
}

export abstract class QueryHandler<T = unknown> {
	abstract execute(query: Query<T>): Promise<T>
}
