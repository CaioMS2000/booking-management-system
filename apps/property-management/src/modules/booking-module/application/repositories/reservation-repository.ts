import { ReservationPeriod, UniqueId } from '@repo/core'
import { Reservation } from '@/modules/booking-module/domain/models/reservation'

export type ReservationFilters = {
	guestId?: UniqueId
	listingId?: UniqueId
}

export type Pagination = {
	page?: number
	limit?: number
}

export abstract class ReservationRepository {
	abstract save(reservation: Reservation): Promise<void>
	abstract findById(id: UniqueId): Promise<Reservation | null>
	abstract findMany(
		filters?: ReservationFilters,
		pagination?: Pagination
	): Promise<Reservation[]>
	abstract hasOverlapping(
		listingId: UniqueId,
		period: ReservationPeriod
	): Promise<boolean>
}
