import { UniqueId } from '@repo/core'
import { Property } from '@/modules/property-module/domain/models/property'

export abstract class PropertyRepository {
	abstract save(property: Property): Promise<void>
	abstract update(property: Property): Promise<void>
	abstract delete(property: Property): Promise<void>
	abstract findById(id: UniqueId): Promise<Property | null>
	abstract getById(id: UniqueId): Promise<Property>
	abstract findManyByHostId(hostId: UniqueId): Promise<Property[]>
}
