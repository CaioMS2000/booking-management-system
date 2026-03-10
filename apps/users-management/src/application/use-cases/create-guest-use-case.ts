import {
	Email,
	failure,
	IdGenerator,
	Name,
	Phone,
	Result,
	success,
	UseCase,
} from '@repo/core'
import { Guest } from '@/domain/models/guest'
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
	idGeneratorV7: IdGenerator
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
		const createEmailResult = Email.create(input.email)

		if (createEmailResult.isFailure()) {
			return failure(InvalidEmailError)
		}

		const createPhoneResult = Phone.create(input.phone)

		if (createPhoneResult.isFailure()) {
			return failure(InvalidPhoneError)
		}

		const guest = await Guest.create({
			input: {
				name,
				email: createEmailResult.value,
				phone: createPhoneResult.value,
			},
			idGenerator: this.props.idGeneratorV7,
		})

		await this.props.guestRepository.save(guest)
		return success({ guest })
	}
}
