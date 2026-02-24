import { UniqueId } from '@repo/core'
import { Reservation } from '@/modules/booking-module/domain/models/reservation'
import { Pagination } from '@/modules/property-module/application/repositories/params'

export type ReservationFilters = {
	guestId?: UniqueId
	listingId?: UniqueId
}

export abstract class ReservationRepository {
	abstract save(reservation: Reservation): Promise<void>
	abstract findById(id: UniqueId): Promise<Reservation | null>
	abstract findMany(
		filters?: ReservationFilters,
		pagination?: Pagination
	): Promise<Reservation[]>
}
