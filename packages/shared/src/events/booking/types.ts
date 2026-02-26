import {
	Money,
	ReservationPeriod,
	ReservationStatus,
	UniqueId,
} from '@repo/core'

export interface ReservationEventSource {
	id: UniqueId
	listingId: UniqueId
	guestId: UniqueId
	period: ReservationPeriod
	status: ReservationStatus
	totalPrice: Money
}
