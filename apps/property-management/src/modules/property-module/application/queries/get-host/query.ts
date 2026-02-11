import { Either, UniqueEntityID } from '@repo/core'
import { HostNotFoundError } from '@/modules/property-module/application/@errors'
import { resolveId } from '@/modules/property-module/application/utils/resolve-id'

import { Query } from '../../query'
import { HostReadModel } from './read-model'

type GetHostQueryParams = {
	hostId: string
}

export class GetHostQuery extends Query<
	Either<HostNotFoundError, HostReadModel>
> {
	readonly props: GetHostQueryParams

	get hostId() {
		return new UniqueEntityID(this.props.hostId)
	}

	static async create(
		params: GetHostQueryParams,
		id?: UniqueEntityID
	): Promise<GetHostQuery> {
		const resolvedId = await resolveId(id)
		return new GetHostQuery(resolvedId, params)
	}

	protected constructor(id: UniqueEntityID, props: GetHostQueryParams) {
		super(id)
		this.props = props
	}
}
