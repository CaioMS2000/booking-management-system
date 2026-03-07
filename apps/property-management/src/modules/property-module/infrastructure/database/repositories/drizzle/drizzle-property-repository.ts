import { and, eq, isNull } from 'drizzle-orm'
import type { UniqueId } from '@repo/core'
import { database } from '@/lib/drizzle'
import { PropertyRepository } from '@/modules/property-module/application/repositories/property-repository'
import { PropertyNotFoundError } from '@/modules/property-module/application/@errors/property-not-found-error'
import type { Property } from '@/modules/property-module/domain/models/property'
import { properties } from '../../schemas/drizzle/properties'
import { PropertyMapper } from '../../mappers/property-mapper'

export class DrizzlePropertyRepository extends PropertyRepository {
	async save(property: Property): Promise<void> {
		await database
			.insert(properties)
			.values(PropertyMapper.toPersistence(property))
	}

	async update(property: Property): Promise<void> {
		const data = PropertyMapper.toPersistence(property)
		await database
			.update(properties)
			.set(data)
			.where(eq(properties.id, property.id))
	}

	async delete(property: Property): Promise<void> {
		await database
			.update(properties)
			.set({ deletedAt: property.deletedAt })
			.where(eq(properties.id, property.id))
	}

	async findById(id: UniqueId): Promise<Property | null> {
		const [row] = await database
			.select()
			.from(properties)
			.where(and(eq(properties.id, id), isNull(properties.deletedAt)))
			.limit(1)

		if (!row) return null
		return PropertyMapper.toDomain(row)
	}

	async getById(id: UniqueId): Promise<Property> {
		const property = await this.findById(id)
		if (!property) throw new PropertyNotFoundError(`Property not found: ${id}`)
		return property
	}

	async findManyByHostId(hostId: UniqueId): Promise<Property[]> {
		const rows = await database
			.select()
			.from(properties)
			.where(and(eq(properties.hostId, hostId), isNull(properties.deletedAt)))

		return rows.map(PropertyMapper.toDomain)
	}
}
