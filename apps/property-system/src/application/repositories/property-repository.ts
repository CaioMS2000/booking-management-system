import { Property } from '@/domain/entities/property'

export abstract class PropertyRepository {
	abstract getAll(): Promise<Property[]>
}
