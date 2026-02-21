import {
	Result,
	failure,
	UseCase,
	UniqueId,
	success,
	Email,
	Phone,
} from '@repo/core'
import { Host } from '../../domain/models/host'
import {
	HostNotFoundError,
	InvalidEmailError,
	InvalidPhoneError,
} from '../@errors'
import { HostRepository } from '../repositories/host-repository'

export type UpdateHostUseCaseRequest = {
	hostId: string
	name?: string
	email?: string
	phone?: string
}

export type UpdateHostUseCaseResponse = Result<
	HostNotFoundError | InvalidEmailError | InvalidPhoneError,
	{
		host: Host
	}
>

type UseCaseProps = {
	hostRepository: HostRepository
}

export class UpdateHostUseCase extends UseCase<
	UpdateHostUseCaseRequest,
	UpdateHostUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: UpdateHostUseCaseRequest
	): Promise<UpdateHostUseCaseResponse> {
		const host = await this.props.hostRepository.findById(
			UniqueId(input.hostId)
		)

		if (!host) {
			return failure(HostNotFoundError)
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

		const updatedHost = host.update(updateFields)

		await this.props.hostRepository.update(updatedHost)

		return success({ host: updatedHost })
	}
}
