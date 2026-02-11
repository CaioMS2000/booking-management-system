import { Either, UniqueEntityID } from '@repo/core'
import { OwnerNotFoundError } from '@/modules/property-module/application/@errors'
import { resolveId } from '@/modules/property-module/application/utils/resolve-id'

import { Query } from '../../query'
import { OwnerReadModel } from './read-model'

type GetOwnerQueryParams = {
	ownerId: string
}

export class GetOwnerQuery extends Query<
	Either<OwnerNotFoundError, OwnerReadModel>
> {
	readonly props: GetOwnerQueryParams

	get ownerId() {
		return new UniqueEntityID(this.props.ownerId)
	}

	static async create(
		params: GetOwnerQueryParams,
		id?: UniqueEntityID
	): Promise<GetOwnerQuery> {
		const resolvedId = await resolveId(id)
		return new GetOwnerQuery(resolvedId, params)
	}

	protected constructor(id: UniqueEntityID, props: GetOwnerQueryParams) {
		super(id)
		this.props = props
	}
}
