import { type Currency, type ReservationStatus, UniqueId } from '@repo/core'
import { Reservation } from '@/modules/booking-module/domain/models/reservation'
import type {
	ReservationDrizzleInput,
	ReservationDrizzleModel,
} from '../schemas/drizzle/reservations'

export class ReservationMapper {
	static toDomain(row: ReservationDrizzleModel): Reservation {
		return new Reservation({
			id: UniqueId(row.id),
			listingId: UniqueId(row.listingId),
			guestId: UniqueId(row.guestId),
			period: {
				from: row.checkIn,
				to: row.checkOut,
			},
			status: row.status as ReservationStatus,
			totalPrice: {
				valueInCents: row.totalPriceCents,
				currency: row.currency as Currency,
			},
		})
	}

	static toPersistence(reservation: Reservation): ReservationDrizzleInput {
		return {
			id: reservation.id,
			listingId: reservation.listingId,
			guestId: reservation.guestId,
			checkIn: reservation.period.from,
			checkOut: reservation.period.to,
			status: reservation.status,
			totalPriceCents: reservation.totalPrice.valueInCents,
			currency: reservation.totalPrice.currency,
		}
	}
}
