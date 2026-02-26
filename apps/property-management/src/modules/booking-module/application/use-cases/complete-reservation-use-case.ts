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
	ReservationNotConfirmedError,
} from '../@errors'
import { ReservationCompletedEvent } from '@repo/shared'
import { ReservationRepository } from '../repositories/reservation-repository'

export type CompleteReservationUseCaseRequest = {
	reservationId: string
}

export type CompleteReservationUseCaseResponse = Result<
	ReservationNotFoundError | ReservationNotConfirmedError,
	null
>

type UseCaseProps = {
	reservationRepository: ReservationRepository
	eventBus: EventBus
}

export class CompleteReservationUseCase extends UseCase<
	CompleteReservationUseCaseRequest,
	CompleteReservationUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: CompleteReservationUseCaseRequest
	): Promise<CompleteReservationUseCaseResponse> {
		const reservation = await this.props.reservationRepository.findById(
			UniqueId(input.reservationId)
		)

		if (!reservation) {
			return failure(ReservationNotFoundError)
		}

		if (reservation.status !== 'CONFIRMED') {
			return failure(ReservationNotConfirmedError)
		}

		const completedReservation = reservation.complete()

		await this.props.reservationRepository.save(completedReservation)

		this.props.eventBus.emit(
			ReservationCompletedEvent.fromReservation(completedReservation)
		)

		return success(null)
	}
}
