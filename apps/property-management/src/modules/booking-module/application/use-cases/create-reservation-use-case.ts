import {
	EventBus,
	failure,
	Money,
	ReservationPeriod,
	Result,
	success,
	UniqueId,
	UseCase,
} from '@repo/core'
import { PropertyModuleInterface } from '@repo/modules-contracts'
import { Reservation } from '../../domain/models/reservation'
import { ReservationMinDurationRule } from '../../domain/rules/reservation-min-duration-rule'
import { InvalidReservationPeriodError, ListingNotFoundError } from '../@errors'
import { ReservationCreatedEvent } from '../@events/reservation-created-event'
import { ReservationRepository } from '../repositories/reservation-repository'

export type CreateReservationUseCaseRequest = {
	listingId: string
	guestId: string
	period: ReservationPeriod
	totalPrice: Money
}

export type CreateReservationUseCaseResponse = Result<
	InvalidReservationPeriodError | ListingNotFoundError,
	{
		reservation: Reservation
	}
>

type UseCaseProps = {
	propertyModule: PropertyModuleInterface
	reservationRepository: ReservationRepository
	eventBus: EventBus
}

export class CreateReservationUseCase extends UseCase<
	CreateReservationUseCaseRequest,
	CreateReservationUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: CreateReservationUseCaseRequest
	): Promise<CreateReservationUseCaseResponse> {
		const minDurationRule = new ReservationMinDurationRule()

		if (!minDurationRule.validate(input.period)) {
			return failure(InvalidReservationPeriodError)
		}

		const listing = await this.props.propertyModule.findListing(input.listingId)

		if (!listing) {
			return failure(ListingNotFoundError)
		}

		const reservation = await Reservation.create({
			listingId: UniqueId(input.listingId),
			guestId: UniqueId(input.guestId),
			period: input.period,
			totalPrice: input.totalPrice,
		})

		await this.props.reservationRepository.save(reservation)

		this.eventBus.emit(ReservationCreatedEvent.fromReservation(reservation))

		return success({ reservation })
	}

	get eventBus() {
		return this.props.eventBus
	}
}
