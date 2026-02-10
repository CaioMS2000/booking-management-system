import { UniqueEntityID } from '@repo/core'
import { appContext } from '@/application-context'
import { Query } from '../../query'
import { NullablePropertyReadModel } from './read-model'

type GetPropertyQueryParams = {
	propertyId: string
}

export class GetPropertyQuery extends Query<NullablePropertyReadModel> {
	readonly props: GetPropertyQueryParams

	get propertyId() {
		return new UniqueEntityID(this.props.propertyId)
	}

	static async create(
		params: GetPropertyQueryParams,
		id?: UniqueEntityID
	): Promise<GetPropertyQuery> {
		let resolvedId: UniqueEntityID

		if (id) {
			resolvedId = id
		} else {
			const context = appContext.get()
			const idGenerator = context.idGenerator.V4
			const newId = await idGenerator.generate()
			resolvedId = newId
		}

		return new GetPropertyQuery(resolvedId, params)
	}

	protected constructor(id: UniqueEntityID, props: GetPropertyQueryParams) {
		super(id)
		this.props = props
	}
}
