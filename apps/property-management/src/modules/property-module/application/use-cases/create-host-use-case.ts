import {
	Result,
	Email,
	failure,
	Name,
	UseCase,
	Phone,
	success,
} from '@repo/core'
import { Host } from '../../domain' // OR import { Host } from "@property-module/domain"
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

		const host = await Host.create({
			name,
			email: createEmailResult.value,
			phone: createPhoneResult.value,
		})

		return success({ host })
	}
}
