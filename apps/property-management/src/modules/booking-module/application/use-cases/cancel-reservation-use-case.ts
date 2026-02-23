import {
	EventBus,
	failure,
	Result,
	success,
	UniqueId,
	UseCase,
} from '@repo/core'
import {
	ReservationNotFoundError,
	ReservationAlreadyCancelledError,
} from '../@errors'
import { ReservationCancelledEvent } from '../@events/reservation-cancelled-event'
import { ReservationRepository } from '../repositories/reservation-repository'

export type CancelReservationUseCaseRequest = {
	reservationId: string
}

export type CancelReservationUseCaseResponse = Result<
	ReservationNotFoundError | ReservationAlreadyCancelledError,
	null
>

type UseCaseProps = {
	reservationRepository: ReservationRepository
	eventBus: EventBus
}

export class CancelReservationUseCase extends UseCase<
	CancelReservationUseCaseRequest,
	CancelReservationUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: CancelReservationUseCaseRequest
	): Promise<CancelReservationUseCaseResponse> {
		const reservation = await this.props.reservationRepository.findById(
			UniqueId(input.reservationId)
		)

		if (!reservation) {
			return failure(ReservationNotFoundError)
		}

		if (reservation.status === 'CANCELLED') {
			return failure(ReservationAlreadyCancelledError)
		}

		const cancelledReservation = reservation.cancel()

		await this.props.reservationRepository.save(cancelledReservation)

		this.props.eventBus.emit(
			ReservationCancelledEvent.fromReservation(cancelledReservation)
		)

		return success(null)
	}
}
