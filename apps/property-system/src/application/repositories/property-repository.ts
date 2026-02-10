import { Property } from '@/domain/entities/property'
import { UniqueEntityID } from '@repo/core'

export abstract class PropertyRepository {
	abstract getAll(): Promise<Property[]>
	abstract get(id: UniqueEntityID): Promise<Property>
}
