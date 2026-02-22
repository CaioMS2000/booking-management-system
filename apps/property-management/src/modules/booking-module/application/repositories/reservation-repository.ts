import { UniqueId } from '@repo/core'
import { Reservation } from '@/modules/booking-module/domain/models/reservation'

export abstract class ReservationRepository {
	abstract save(reservation: Reservation): Promise<void>
	abstract findById(id: UniqueId): Promise<Reservation | null>
}
