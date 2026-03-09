import {
	Result,
	Email,
	failure,
	IdGenerator,
	Name,
	UseCase,
	Phone,
	success,
} from '@repo/core'
import { Host } from '../../domain'
import { InvalidEmailError, InvalidPhoneError } from '../@errors'

export type CreateHostUseCaseRequest = {
	name: string
	email: string
	phone: string
}

export type CreateHostUseCaseResponse = Result<
	InvalidEmailError,
	{
		host: Host
	}
>

type UseCaseProps = {
	idGeneratorV7: IdGenerator
}

export class CreateHostUseCase extends UseCase<
	CreateHostUseCaseRequest,
	CreateHostUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: CreateHostUseCaseRequest
	): Promise<CreateHostUseCaseResponse> {
		const name = Name(input.name)
		const createEmailResult = Email.create(input.email)

		if (createEmailResult.isFailure()) {
			return failure(InvalidEmailError)
		}

		const createPhoneResult = Phone.create(input.phone)

		if (createPhoneResult.isFailure()) {
			return failure(InvalidPhoneError)
		}

		const host = await Host.create({
			input: {
				name,
				email: createEmailResult.value,
				phone: createPhoneResult.value,
			},
			idGenerator: this.props.idGeneratorV7,
		})

		return success({ host })
	}
}
