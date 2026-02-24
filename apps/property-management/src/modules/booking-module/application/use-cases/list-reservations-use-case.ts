import { Result, success, UniqueId, UseCase } from '@repo/core'
import { Reservation } from '../../domain/models/reservation'
import {
	ReservationFilters,
	ReservationRepository,
} from '../repositories/reservation-repository'
import { Pagination } from '@/modules/property-module/application/repositories/params'

export type ListReservationsUseCaseRequest = {
	guestId?: string
	listingId?: string
	page?: number
	limit?: number
}

export type ListReservationsUseCaseResponse = Result<
	never,
	{
		reservations: Reservation[]
	}
>

type UseCaseProps = {
	reservationRepository: ReservationRepository
}

export class ListReservationsUseCase extends UseCase<
	ListReservationsUseCaseRequest,
	ListReservationsUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: ListReservationsUseCaseRequest
	): Promise<ListReservationsUseCaseResponse> {
		const filters: ReservationFilters = {
			...(input.guestId && { guestId: UniqueId(input.guestId) }),
			...(input.listingId && { listingId: UniqueId(input.listingId) }),
		}

		const pagination: Pagination = {
			page: input.page ?? 1,
			limit: input.limit ?? 20,
		}

		const reservations = await this.props.reservationRepository.findMany(
			filters,
			pagination
		)

		return success({ reservations })
	}
}
