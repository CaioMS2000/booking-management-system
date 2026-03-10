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
import { Host } from '@/domain/models/host'
import { BankAccount } from '@/domain/value-object'
import { InvalidEmailError, InvalidPhoneError } from '../@errors'
import { HostRepository } from '../repositories/host-repository'

export type CreateHostUseCaseRequest = {
	name: string
	email: string
	phone: string
	bankAccount: BankAccount
}

export type CreateHostUseCaseResponse = Result<
	InvalidEmailError | InvalidPhoneError,
	{
		host: Host
	}
>

type UseCaseProps = {
	hostRepository: HostRepository
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
				bankAccount: input.bankAccount,
			},
			idGenerator: this.props.idGeneratorV7,
		})

		await this.props.hostRepository.save(host)
		return success({ host })
	}
}
