import { Result, failure, UseCase, UniqueId, success } from '@repo/core'
import {
	ReservationNotFoundError,
	ReservationAlreadyCancelledError,
} from '../@errors'
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

		return success(null)
	}
}
