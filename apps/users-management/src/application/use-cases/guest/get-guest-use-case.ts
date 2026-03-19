import { failure, Result, success, UniqueId, UseCase } from '@repo/core'
import { Guest } from '@/domain/models/guest'
import { GuestNotFoundError, UnauthorizedError } from '../../@errors'
import { GuestRepository } from '../../repositories/guest-repository'

export type GetGuestUseCaseRequest = {
	requesterId: string
	requesterRole: 'HOST' | 'GUEST' | 'ADMIN'
	guestId: string
}

export type GetGuestUseCaseResponse = Result<
	GuestNotFoundError | UnauthorizedError,
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
		if (
			input.requesterRole !== 'ADMIN' &&
			input.requesterId !== input.guestId
		) {
			return failure(UnauthorizedError)
		}

		const guest = await this.props.guestRepository.findById(
			UniqueId(input.guestId)
		)

		if (!guest) {
			return failure(GuestNotFoundError)
		}

		return success({ guest })
	}
}
