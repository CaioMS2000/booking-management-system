import { and, eq, ilike, isNull } from 'drizzle-orm'
import type { UniqueId } from '@repo/core'
import { database } from '@/lib/drizzle'
import {
	GuestRepository,
	type GuestFilters,
} from '@/modules/booking-module/application/repositories/guest-repository'
import type { Pagination } from '@/modules/property-module/application/repositories/params'
import type { Guest } from '@/modules/booking-module/domain/models/guest'
import { guests } from '../../schemas/drizzle/guests'
import { GuestMapper } from '../../mappers/guest-mapper'

export class DrizzleGuestRepository extends GuestRepository {
	async save(guest: Guest): Promise<void> {
		await database.insert(guests).values(GuestMapper.toPersistence(guest))
	}

	async findById(id: UniqueId): Promise<Guest | null> {
		const [row] = await database
			.select()
			.from(guests)
			.where(and(eq(guests.id, id), isNull(guests.deletedAt)))
			.limit(1)

		if (!row) return null
		return GuestMapper.toDomain(row)
	}

	async findMany(
		filters?: GuestFilters,
		pagination?: Pagination
	): Promise<Guest[]> {
		const conditions = [isNull(guests.deletedAt)]

		if (filters?.name) {
			conditions.push(ilike(guests.name, `%${filters.name}%`))
		}
		if (filters?.email) {
			conditions.push(ilike(guests.email, `%${filters.email.value}%`))
		}

		const page = pagination?.page ?? 1
		const limit = pagination?.limit ?? 20

		const rows = await database
			.select()
			.from(guests)
			.where(and(...conditions))
			.limit(limit)
			.offset((page - 1) * limit)

		return rows.map(GuestMapper.toDomain)
	}

	async update(guest: Guest): Promise<void> {
		const data = GuestMapper.toPersistence(guest)
		await database.update(guests).set(data).where(eq(guests.id, guest.id))
	}

	async delete(guest: Guest): Promise<void> {
		await database
			.update(guests)
			.set({ deletedAt: new Date() })
			.where(eq(guests.id, guest.id))
	}
}
