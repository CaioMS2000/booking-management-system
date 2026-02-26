import {
	BaseEvent,
	Money,
	ReservationPeriod,
	ReservationStatus,
} from '@repo/core'
import type { ReservationEventSource } from './types'

export type ReservationCreatedEventPayload = {
	listingId: string
	guestId: string
	period: ReservationPeriod
	status: ReservationStatus
	totalPrice: Money
}

type Props = {
	payload: ReservationCreatedEventPayload
	correlationId?: string
}

export class ReservationCreatedEvent extends BaseEvent {
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
		return new ReservationCreatedEvent({
			payload: {
				listingId: reservation.listingId,
				guestId: reservation.guestId,
				period: reservation.period,
				status: reservation.status,
				totalPrice: reservation.totalPrice,
			},
			correlationId,
		})
	}
}
