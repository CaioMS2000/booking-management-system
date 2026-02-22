import {
	Result,
	failure,
	UseCase,
	UniqueId,
	success,
	Money,
	ReservationPeriod,
} from '@repo/core'
import { Reservation } from '../../domain/models/reservation'
import { ReservationMinDurationRule } from '../../domain/rules/reservation-min-duration-rule'
import { InvalidReservationPeriodError, ListingNotFoundError } from '../@errors'
import { ListingRepository } from '@/modules/property-module/application/repositories/listing-repository'
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
	listingRepository: ListingRepository
	reservationRepository: ReservationRepository
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

		const listing = await this.props.listingRepository.findById(
			UniqueId(input.listingId)
		)

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

		return success({ reservation })
	}
}
