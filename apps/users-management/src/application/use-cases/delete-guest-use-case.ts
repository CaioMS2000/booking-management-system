import { failure, Result, success, UniqueId, UseCase } from '@repo/core'
import { Guest } from '@/domain/models/guest'
import { GuestNotFoundError } from '../@errors'
import { GuestRepository } from '../repositories/guest-repository'

export type DeleteGuestUseCaseRequest = {
	guestId: string
}

export type DeleteGuestUseCaseResponse = Result<GuestNotFoundError, Guest>

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

		const deletedGuest = guest.delete()
		await this.props.guestRepository.delete(deletedGuest)
		return success(deletedGuest)
	}
}
