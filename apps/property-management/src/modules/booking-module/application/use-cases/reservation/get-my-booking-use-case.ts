import { failure, Result, success, UniqueId, UseCase } from '@repo/core'
import { Reservation } from '../../../domain/models/reservation'
import { ReservationNotFoundError, UnauthorizedError } from '../../@errors'
import { ReservationRepository } from '../../repositories/reservation-repository'

export type GetMyBookingUseCaseRequest = {
	guestId: string
	reservationId: string
}

export type GetMyBookingUseCaseResponse = Result<
	ReservationNotFoundError | UnauthorizedError,
	{
		reservation: Reservation
	}
>

type UseCaseProps = {
	reservationRepository: ReservationRepository
}

export class GetMyBookingUseCase extends UseCase<
	GetMyBookingUseCaseRequest,
	GetMyBookingUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: GetMyBookingUseCaseRequest
	): Promise<GetMyBookingUseCaseResponse> {
		const reservation = await this.props.reservationRepository.findById(
			UniqueId(input.reservationId)
		)

		if (!reservation) {
			return failure(ReservationNotFoundError)
		}

		if (String(reservation.guestId) !== input.guestId) {
			return failure(UnauthorizedError)
		}

		return success({ reservation })
	}
}
