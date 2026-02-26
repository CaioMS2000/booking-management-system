import { BaseEvent } from '@repo/core'
import type { ReservationEventSource } from './types'

export type ReservationConfirmedEventPayload = {
	reservationId: string
	listingId: string
	guestId: string
}

type Props = {
	payload: ReservationConfirmedEventPayload
	correlationId?: string
}

export class ReservationConfirmedEvent extends BaseEvent {
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
		return new ReservationConfirmedEvent({
			payload: {
				reservationId: reservation.id,
				listingId: reservation.listingId,
				guestId: reservation.guestId,
			},
			correlationId,
		})
	}
}
