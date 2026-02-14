import { PropertyDTO, PropertyModuleInterface } from '@repo/modules-contracts'
import { GetPropertyQuery } from '../application/queries/get-property/query'
import { PROPERTY_MODULE_TOKENS } from '../tokens'
import { PropertyMapper } from './mappers/property-mapper'

export class PropertyModule extends PropertyModuleInterface {
	async findProperty(propertyId: string): Promise<PropertyDTO | null> {
		const queryBus = container.resolve(PROPERTY_MODULE_TOKENS.QueryBus)
		const result = await queryBus.execute(
			await GetPropertyQuery.create({
				propertyId,
			})
		)

		if (result.isFailure()) {
			return null
		}

		return PropertyMapper.entityToDTO(
			PropertyMapper.queryModelToEntity(result.value)
		)
	}

	propertyExists(propertyId: string): Promise<boolean> {
		return this.findProperty(propertyId).then(property => {
			return property ? true : false
		})
	}
}
