import { Result, success, UniqueId, UseCase } from '@repo/core'
import { Pagination } from '@/modules/property-module/application/repositories/params'
import { Reservation } from '../../../domain/models/reservation'
import { ReservationRepository } from '../../repositories/reservation-repository'

export type GetPropertyReservationsUseCaseRequest = {
	hostId: string
	listingId?: string
	page?: number
	limit?: number
}

export type GetPropertyReservationsUseCaseResponse = Result<
	never,
	{
		reservations: Reservation[]
	}
>

type UseCaseProps = {
	reservationRepository: ReservationRepository
	propertyModule: PropertyModuleInterface
}

export class GetPropertyReservationsUseCase extends UseCase<
	GetPropertyReservationsUseCaseRequest,
	GetPropertyReservationsUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: GetPropertyReservationsUseCaseRequest
	): Promise<GetPropertyReservationsUseCaseResponse> {
		const pagination: Pagination = {
			page: input.page ?? 1,
			limit: input.limit ?? 20,
		}

		const reservations = await this.props.reservationRepository.findMany(
			{
				hostId: UniqueId(input.hostId),
				...(input.listingId && { listingId: UniqueId(input.listingId) }),
			},
			pagination
		)

		return success({ reservations })
	}
}
