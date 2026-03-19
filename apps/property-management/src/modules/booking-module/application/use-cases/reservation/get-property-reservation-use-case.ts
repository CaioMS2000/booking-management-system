import { failure, Result, success, UniqueId, UseCase } from '@repo/core'
import { PropertyModuleInterface } from '@repo/shared'
import { Reservation } from '../../../domain/models/reservation'
import { ReservationNotFoundError, UnauthorizedError } from '../../@errors'
import { ReservationRepository } from '../../repositories/reservation-repository'

export type GetPropertyReservationUseCaseRequest = {
	hostId: string
	reservationId: string
}

export type GetPropertyReservationUseCaseResponse = Result<
	ReservationNotFoundError | UnauthorizedError,
	{
		reservation: Reservation
	}
>

type UseCaseProps = {
	reservationRepository: ReservationRepository
	propertyModule: PropertyModuleInterface
}

export class GetPropertyReservationUseCase extends UseCase<
	GetPropertyReservationUseCaseRequest,
	GetPropertyReservationUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: GetPropertyReservationUseCaseRequest
	): Promise<GetPropertyReservationUseCaseResponse> {
		const reservation = await this.props.reservationRepository.findById(
			UniqueId(input.reservationId)
		)

		if (!reservation) {
			return failure(ReservationNotFoundError)
		}

		const isOwner = await this.props.propertyModule.isListingOwnedByHost(
			String(reservation.listingId),
			input.hostId
		)

		if (!isOwner) {
			return failure(UnauthorizedError)
		}

		return success({ reservation })
	}
}
