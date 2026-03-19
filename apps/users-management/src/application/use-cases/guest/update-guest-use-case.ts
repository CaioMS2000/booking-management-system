import {
	Email,
	failure,
	Phone,
	Result,
	success,
	UniqueId,
	UseCase,
} from '@repo/core'
import { Guest } from '@/domain/models/guest'
import {
	GuestNotFoundError,
	InvalidEmailError,
	InvalidPhoneError,
	UnauthorizedError,
} from '../../@errors'
import { GuestRepository } from '../../repositories/guest-repository'

export type UpdateGuestUseCaseRequest = {
	requesterId: string
	requesterRole: 'HOST' | 'GUEST' | 'ADMIN'
	guestId: string
	name?: string
	email?: string
	phone?: string
}

export type UpdateGuestUseCaseResponse = Result<
	| GuestNotFoundError
	| InvalidEmailError
	| InvalidPhoneError
	| UnauthorizedError,
	{
		guest: Guest
	}
>

type UseCaseProps = {
	guestRepository: GuestRepository
}

export class UpdateGuestUseCase extends UseCase<
	UpdateGuestUseCaseRequest,
	UpdateGuestUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: UpdateGuestUseCaseRequest
	): Promise<UpdateGuestUseCaseResponse> {
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

		const updateFields: { name?: string; email?: Email; phone?: Phone } = {}

		if (input.name !== undefined) {
			updateFields.name = input.name
		}

		if (input.email !== undefined) {
			const emailResult = Email.create(input.email)
			if (emailResult.isFailure()) {
				return failure(InvalidEmailError)
			}
			updateFields.email = emailResult.value
		}

		if (input.phone !== undefined) {
			const phoneResult = Phone.create(input.phone)
			if (phoneResult.isFailure()) {
				return failure(InvalidPhoneError)
			}
			updateFields.phone = phoneResult.value
		}

		const updatedGuest = guest.update(updateFields)

		await this.props.guestRepository.update(updatedGuest)

		return success({ guest: updatedGuest })
	}
}
