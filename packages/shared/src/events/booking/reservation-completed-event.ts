import { BaseEvent } from '@repo/core'
import type { ReservationEventSource } from './types'

export type ReservationCompletedEventPayload = {
	reservationId: string
	listingId: string
	guestId: string
}

type Props = {
	payload: ReservationCompletedEventPayload
	correlationId?: string
}

export class ReservationCompletedEvent extends BaseEvent {
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
		return new ReservationCompletedEvent({
			payload: {
				reservationId: reservation.id,
				listingId: reservation.listingId,
				guestId: reservation.guestId,
			},
			correlationId,
		})
	}
}
