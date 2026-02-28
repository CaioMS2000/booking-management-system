import { Result, failure, success, UniqueId, UseCase } from '@repo/core'
import { Guest } from '../../domain/models/guest'
import { GuestNotFoundError } from '../@errors'
import { GuestRepository } from '../repositories/guest-repository'

export type GetGuestUseCaseRequest = {
	guestId: string
}

export type GetGuestUseCaseResponse = Result<
	GuestNotFoundError,
	{
		guest: Guest
	}
>

type UseCaseProps = {
	guestRepository: GuestRepository
}

export class GetGuestUseCase extends UseCase<
	GetGuestUseCaseRequest,
	GetGuestUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: GetGuestUseCaseRequest
	): Promise<GetGuestUseCaseResponse> {
		const guest = await this.props.guestRepository.findById(
			UniqueId(input.guestId)
		)

		if (!guest) {
			return failure(GuestNotFoundError)
		}

		return success({ guest })
	}
}
