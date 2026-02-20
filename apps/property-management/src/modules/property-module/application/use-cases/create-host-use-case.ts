import {
	Result,
	Email,
	failure,
	Name,
	UseCase,
	Phone,
	UniqueId,
	success,
} from '@repo/core'
import { Host } from '../../domain' // OR import { Host } from "@property-module/domain"
import { InvalidEmailError, InvalidPhoneError } from '../@errors'
import { appContext } from '@/application-context'

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

export class CreateHostUseCase extends UseCase<
	CreateHostUseCaseRequest,
	CreateHostUseCaseResponse
> {
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

		const context = appContext.get()
		const id = await context.idGenerator.V7.generate()
		const host = Host.create({
			id: UniqueId(id),
			name,
			email: createEmailResult.value,
			phone: createPhoneResult.value,
		})

		return success({ host })
	}
}
