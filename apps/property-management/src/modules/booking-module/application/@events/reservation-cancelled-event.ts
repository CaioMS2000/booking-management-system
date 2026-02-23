import { BaseEvent } from '@repo/core'
import { Reservation } from '../../domain/models/reservation'

export type ReservationCancelledEventPayload = {
	reservationId: string
	listingId: string
	guestId: string
}

type Props = {
	payload: ReservationCancelledEventPayload
	correlationId?: string
}

export class ReservationCancelledEvent extends BaseEvent {
	constructor(protected props: Props) {
		super(props.correlationId)
	}

	get payload() {
		return this.props.payload
	}

	static fromReservation(reservation: Reservation, correlationId?: string) {
		return new ReservationCancelledEvent({
			payload: {
				reservationId: reservation.id,
				listingId: reservation.listingId,
				guestId: reservation.guestId,
			},
			correlationId,
		})
	}
}
