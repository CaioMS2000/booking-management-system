import {
	EventBus,
	failure,
	Result,
	success,
	UniqueId,
	UseCase,
} from '@repo/core'
import {
	CancellationWindowExpiredError,
	ReservationAlreadyCancelledError,
	ReservationNotFoundError,
} from '../@errors'
import { CancellationWindowRule } from '../../domain/rules/cancellation-window-rule'
import { ReservationCancelledEvent } from '../@events/reservation-cancelled-event'
import { ReservationRepository } from '../repositories/reservation-repository'

export type CancelReservationUseCaseRequest = {
	reservationId: string
	now?: Date
}

export type CancelReservationUseCaseResponse = Result<
	| ReservationNotFoundError
	| ReservationAlreadyCancelledError
	| CancellationWindowExpiredError,
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

		const cancellationWindowRule = new CancellationWindowRule()
		const now = input.now ?? new Date()

		if (
			!cancellationWindowRule.validate({
				checkInDate: reservation.period.from,
				now,
			})
		) {
			return failure(CancellationWindowExpiredError)
		}

		const cancelledReservation = reservation.cancel()

		await this.props.reservationRepository.save(cancelledReservation)

		this.props.eventBus.emit(
			ReservationCancelledEvent.fromReservation(cancelledReservation)
		)

		return success(null)
	}
}
