import { Property } from '@/domain/entities/property'
import { UniqueEntityID } from '@repo/core'

export abstract class PropertyRepository {
	abstract save(property: Property): Promise<void>
	abstract findAll(): Promise<Property[]>
	abstract findById(id: UniqueEntityID): Promise<Property | null>
	abstract getById(id: UniqueEntityID): Promise<Property>
	abstract findManyByOwnerId(ownerId: UniqueEntityID): Promise<Property[]>
}
