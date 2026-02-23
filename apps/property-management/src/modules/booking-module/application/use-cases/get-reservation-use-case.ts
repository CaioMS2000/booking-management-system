import { Result, failure, success, UniqueId, UseCase } from '@repo/core'
import { Reservation } from '../../domain/models/reservation'
import { ReservationNotFoundError } from '../@errors'
import { ReservationRepository } from '../repositories/reservation-repository'

export type GetReservationUseCaseRequest = {
	reservationId: string
}

export type GetReservationUseCaseResponse = Result<
	ReservationNotFoundError,
	{
		reservation: Reservation
	}
>

type UseCaseProps = {
	reservationRepository: ReservationRepository
}

export class GetReservationUseCase extends UseCase<
	GetReservationUseCaseRequest,
	GetReservationUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: GetReservationUseCaseRequest
	): Promise<GetReservationUseCaseResponse> {
		const reservation = await this.props.reservationRepository.findById(
			UniqueId(input.reservationId)
		)

		if (!reservation) {
			return failure(ReservationNotFoundError)
		}

		return success({ reservation })
	}
}
