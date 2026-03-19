import { Result, success, UniqueId, UseCase } from '@repo/core'
import { Reservation } from '../../../domain/models/reservation'
import { Pagination } from '@/modules/property-module/application/repositories/params'
import { ReservationRepository } from '../../repositories/reservation-repository'

export type GetMyBookingsUseCaseRequest = {
	guestId: string
	page?: number
	limit?: number
}

export type GetMyBookingsUseCaseResponse = Result<
	never,
	{
		reservations: Reservation[]
	}
>

type UseCaseProps = {
	reservationRepository: ReservationRepository
}

export class GetMyBookingsUseCase extends UseCase<
	GetMyBookingsUseCaseRequest,
	GetMyBookingsUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: GetMyBookingsUseCaseRequest
	): Promise<GetMyBookingsUseCaseResponse> {
		const pagination: Pagination = {
			page: input.page ?? 1,
			limit: input.limit ?? 20,
		}

		const reservations = await this.props.reservationRepository.findMany(
			{ guestId: UniqueId(input.guestId) },
			pagination
		)

		return success({ reservations })
	}
}
