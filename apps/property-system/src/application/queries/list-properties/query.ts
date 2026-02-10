import { UniqueEntityID } from '@repo/core'
import { Query } from '../../query'
import { PropertyWithOwnerReadModel } from './read-model'
import { resolveId } from '@/application/utils/resolve-id'

export class ListPropertiesQuery extends Query<PropertyWithOwnerReadModel[]> {
	static async create(id?: UniqueEntityID): Promise<ListPropertiesQuery> {
		id = await resolveId(id)

		return new ListPropertiesQuery(id)
	}
}
