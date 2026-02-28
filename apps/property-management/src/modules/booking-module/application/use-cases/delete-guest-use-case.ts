import { Result, failure, success, UniqueId, UseCase } from '@repo/core'
import { GuestNotFoundError } from '../@errors'
import { GuestRepository } from '../repositories/guest-repository'

export type DeleteGuestUseCaseRequest = {
	guestId: string
}

export type DeleteGuestUseCaseResponse = Result<GuestNotFoundError, null>

type UseCaseProps = {
	guestRepository: GuestRepository
}

export class DeleteGuestUseCase extends UseCase<
	DeleteGuestUseCaseRequest,
	DeleteGuestUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: DeleteGuestUseCaseRequest
	): Promise<DeleteGuestUseCaseResponse> {
		const guest = await this.props.guestRepository.findById(
			UniqueId(input.guestId)
		)

		if (!guest) {
			return failure(GuestNotFoundError)
		}

		await this.props.guestRepository.delete(guest)

		return success(null)
	}
}
