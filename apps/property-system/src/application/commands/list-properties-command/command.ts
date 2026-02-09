import { appContext } from '@/application-context'
import { Owner, OwnerProps } from '@/domain/entities/owner'
import { Property, PropertyProps } from '@/domain/entities/property'
import { CommandWithResult } from '../../command'
import { UniqueEntityID } from '@repo/core'

export class ListPropertiesCommand extends CommandWithResult<
	PropertyWithOwner[]
> {
	static async create(id?: UniqueEntityID): Promise<ListPropertiesCommand> {
		let resolvedId: UniqueEntityID

		if (id) {
			resolvedId = id
		} else {
			const context = appContext.get()
			const idGenerator = context.idGenerator.V4
			const newId = await idGenerator.generate()
			resolvedId = newId
		}

		return new ListPropertiesCommand(resolvedId)
	}
}

export type PropertyWithOwner = Omit<PropertyProps, 'ownerId'> & {
	owner: Omit<OwnerProps, 'propertiesIds'>
}
