import {
	EventBus,
	failure,
	Result,
	success,
	UniqueId,
	UseCase,
} from '@repo/core'
import { PropertyModuleInterface } from '@repo/modules-contracts'
import {
	ReservationNotFoundError,
	ReservationNotPendingError,
} from '../@errors'
import { ReservationConfirmedEvent } from '../@events/reservation-confirmed-event'
import { ReservationRepository } from '../repositories/reservation-repository'

export type ConfirmReservationUseCaseRequest = {
	reservationId: string
}

export type ConfirmReservationUseCaseResponse = Result<
	ReservationNotFoundError | ReservationNotPendingError,
	null
>

type UseCaseProps = {
	propertyModule: PropertyModuleInterface
	reservationRepository: ReservationRepository
	eventBus: EventBus
}

export class ConfirmReservationUseCase extends UseCase<
	ConfirmReservationUseCaseRequest,
	ConfirmReservationUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: ConfirmReservationUseCaseRequest
	): Promise<ConfirmReservationUseCaseResponse> {
		const reservation = await this.props.reservationRepository.findById(
			UniqueId(input.reservationId)
		)

		if (!reservation) {
			return failure(ReservationNotFoundError)
		}

		if (reservation.status !== 'PENDING') {
			return failure(ReservationNotPendingError)
		}

		const confirmedReservation = reservation.confirm()

		await this.props.reservationRepository.save(confirmedReservation)

		await this.props.propertyModule.confirmReservationOnListing(
			reservation.listingId,
			reservation.period
		)

		this.props.eventBus.emit(
			ReservationConfirmedEvent.fromReservation(confirmedReservation)
		)

		return success(null)
	}
}
