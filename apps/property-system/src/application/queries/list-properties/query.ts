import { appContext } from '@/application-context'
import { UniqueEntityID } from '@repo/core'
import { Query } from '../../query'
import { PropertyWithOwnerReadModel } from './read-model'

export class ListPropertiesQuery extends Query<PropertyWithOwnerReadModel[]> {
	static async create(id?: UniqueEntityID): Promise<ListPropertiesQuery> {
		let resolvedId: UniqueEntityID

		if (id) {
			resolvedId = id
		} else {
			const context = appContext.get()
			const idGenerator = context.idGenerator.V4
			const newId = await idGenerator.generate()
			resolvedId = newId
		}

		return new ListPropertiesQuery(resolvedId)
	}
}
