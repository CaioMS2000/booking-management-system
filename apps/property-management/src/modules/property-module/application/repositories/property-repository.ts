import { UniqueEntityID } from '@repo/core'
import { Property } from '@/modules/property-module/domain/entities/property'

export abstract class PropertyRepository {
	abstract save(property: Property): Promise<void>
	abstract findAll(): Promise<Property[]>
	abstract findById(id: UniqueEntityID): Promise<Property | null>
	abstract getById(id: UniqueEntityID): Promise<Property>
	abstract findManyByHostId(hostId: UniqueEntityID): Promise<Property[]>
}
