import {
	Class,
	Money,
	Optional,
	ReservationPeriod,
	ReservationStatus,
	UniqueId,
} from '@repo/core'
import { appContext } from '@/application-context'

export type ReservationProps = {
	id: UniqueId
	listingId: UniqueId
	guestId: UniqueId
	period: ReservationPeriod
	status: ReservationStatus
	totalPrice: Money
}

export type ReservationCreateInput = Omit<
	Optional<ReservationProps, 'status'>,
	'id'
>

export class Reservation extends Class<ReservationProps> {
	constructor(protected readonly props: ReservationProps) {
		super()
	}

	get id() {
		return this.props.id
	}

	get period() {
		return this.props.period
	}

	get status() {
		return this.props.status
	}

	get totalPrice() {
		return this.props.totalPrice
	}

	get listingId() {
		return this.props.listingId
	}

	get guestId() {
		return this.props.guestId
	}

	confirm(): Reservation {
		return new Reservation({
			...this.props,
			status: 'CONFIRMED',
		})
	}

	complete(): Reservation {
		return new Reservation({
			...this.props,
			status: 'COMPLETED',
		})
	}

	cancel(): Reservation {
		return new Reservation({
			...this.props,
			status: 'CANCELLED',
		})
	}

	static async create(input: ReservationCreateInput, id?: UniqueId) {
		const { guestId, period, listingId, totalPrice, status = 'PENDING' } = input

		if (!id) {
			const context = appContext.get()
			id = await context.idGenerator.V7.generate()
		}

		return new Reservation({
			id,
			guestId,
			period,
			listingId,
			totalPrice,
			status,
		})
	}
}
