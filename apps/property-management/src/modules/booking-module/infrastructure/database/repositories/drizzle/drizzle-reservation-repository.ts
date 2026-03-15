import { and, eq } from 'drizzle-orm'
import type { UniqueId } from '@repo/core'
import { database } from '@/lib/drizzle'
import {
	ReservationRepository,
	type ReservationFilters,
} from '@/modules/booking-module/application/repositories/reservation-repository'
import type { Pagination } from '@/modules/property-module/application/repositories/params'
import type { Reservation } from '@/modules/booking-module/domain/models/reservation'
import { reservations } from '../../schemas/drizzle/reservations'
import { ReservationMapper } from '../../mappers/reservation-mapper'

export class DrizzleReservationRepository extends ReservationRepository {
	async save(reservation: Reservation): Promise<void> {
		await database
			.insert(reservations)
			.values(ReservationMapper.toPersistence(reservation))
	}

	async findById(id: UniqueId): Promise<Reservation | null> {
		const [row] = await database
			.select()
			.from(reservations)
			.where(eq(reservations.id, id))
			.limit(1)

		if (!row) return null
		return ReservationMapper.toDomain(row)
	}

	async findMany(
		filters?: ReservationFilters,
		pagination?: Pagination
	): Promise<Reservation[]> {
		const conditions = []

		if (filters?.guestId) {
			conditions.push(eq(reservations.guestId, filters.guestId))
		}
		if (filters?.listingId) {
			conditions.push(eq(reservations.listingId, filters.listingId))
		}

		const page = pagination?.page ?? 1
		const limit = pagination?.limit ?? 20

		const query = database.select().from(reservations)

		const rows =
			conditions.length > 0
				? await query
						.where(and(...conditions))
						.limit(limit)
						.offset((page - 1) * limit)
				: await query.limit(limit).offset((page - 1) * limit)

		return rows.map(ReservationMapper.toDomain)
	}
}
