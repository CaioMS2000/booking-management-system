import { UniqueEntityID } from '@repo/core'
import { resolveId } from '@/modules/property-module/application/utils/resolve-id'
import { Query } from '../../query'
import { PropertyWithOwnerReadModel } from './read-model'

export class ListPropertiesQuery extends Query<PropertyWithOwnerReadModel[]> {
	static async create(id?: UniqueEntityID): Promise<ListPropertiesQuery> {
		id = await resolveId(id)

		return new ListPropertiesQuery(id)
	}
}
