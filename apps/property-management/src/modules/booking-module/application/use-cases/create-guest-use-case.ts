import {
	Result,
	Email,
	failure,
	Name,
	UseCase,
	Phone,
	success,
} from '@repo/core'
import { Guest } from '../../domain/models/guest'
import { InvalidEmailError, InvalidPhoneError } from '../@errors'
import { GuestRepository } from '../repositories/guest-repository'

export type CreateGuestUseCaseRequest = {
	name: string
	email: string
	phone: string
}

export type CreateGuestUseCaseResponse = Result<
	InvalidEmailError | InvalidPhoneError,
	{
		guest: Guest
	}
>

type UseCaseProps = {
	guestRepository: GuestRepository
}

export class CreateGuestUseCase extends UseCase<
	CreateGuestUseCaseRequest,
	CreateGuestUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: CreateGuestUseCaseRequest
	): Promise<CreateGuestUseCaseResponse> {
		const name = Name(input.name)

		const emailResult = Email.create(input.email)
		if (emailResult.isFailure()) {
			return failure(InvalidEmailError)
		}

		const phoneResult = Phone.create(input.phone)
		if (phoneResult.isFailure()) {
			return failure(InvalidPhoneError)
		}

		const guest = await Guest.create({
			name,
			email: emailResult.value,
			phone: phoneResult.value,
		})

		await this.props.guestRepository.save(guest)

		return success({ guest })
	}
}
