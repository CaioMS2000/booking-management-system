import { BaseEvent } from '@repo/core'
import type { ReservationEventSource } from './types'

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

	static fromReservation(
		reservation: ReservationEventSource,
		correlationId?: string
	) {
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
