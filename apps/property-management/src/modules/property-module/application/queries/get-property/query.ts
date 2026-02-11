import { Either, UniqueEntityID } from '@repo/core'
import { PropertyNotFoundError } from '@/modules/property-module/application/@errors'
import { resolveId } from '@/modules/property-module/application/utils/resolve-id'

import { Query } from '../../query'
import { PropertyReadModel } from './read-model'

type GetPropertyQueryParams = {
	propertyId: string
}

export class GetPropertyQuery extends Query<
	Either<PropertyNotFoundError, PropertyReadModel>
> {
	readonly props: GetPropertyQueryParams

	get propertyId() {
		return new UniqueEntityID(this.props.propertyId)
	}

	static async create(
		params: GetPropertyQueryParams,
		id?: UniqueEntityID
	): Promise<GetPropertyQuery> {
		const resolvedId = await resolveId(id)
		return new GetPropertyQuery(resolvedId, params)
	}

	protected constructor(id: UniqueEntityID, props: GetPropertyQueryParams) {
		super(id)
		this.props = props
	}
}
