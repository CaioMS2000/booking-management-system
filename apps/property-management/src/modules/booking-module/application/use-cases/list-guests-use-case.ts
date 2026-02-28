import { Email, Name, Result, success, UseCase } from '@repo/core'
import { Guest } from '../../domain/models/guest'
import { GuestFilters, GuestRepository } from '../repositories/guest-repository'
import { Pagination } from '@/modules/property-module/application/repositories/params'

export type ListGuestsUseCaseRequest = {
	name?: string
	email?: string
	page?: number
	limit?: number
}

export type ListGuestsUseCaseResponse = Result<
	never,
	{
		guests: Guest[]
	}
>

type UseCaseProps = {
	guestRepository: GuestRepository
}

export class ListGuestsUseCase extends UseCase<
	ListGuestsUseCaseRequest,
	ListGuestsUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: ListGuestsUseCaseRequest
	): Promise<ListGuestsUseCaseResponse> {
		const filters: GuestFilters = {
			...(input.name && { name: Name(input.name) }),
		}

		if (input.email) {
			const emailResult = Email.create(input.email)
			if (emailResult.isSuccess()) {
				filters.email = emailResult.value
			}
		}

		const pagination: Pagination = {
			page: input.page ?? 1,
			limit: input.limit ?? 20,
		}

		const guests = await this.props.guestRepository.findMany(
			filters,
			pagination
		)

		return success({ guests })
	}
}
