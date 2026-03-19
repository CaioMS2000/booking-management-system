import {
	Email,
	failure,
	Phone,
	Result,
	success,
	UniqueId,
	UseCase,
} from '@repo/core'
import { Host } from '@/domain/models/host'
import {
	HostNotFoundError,
	InvalidEmailError,
	InvalidPhoneError,
	UnauthorizedError,
} from '../../@errors'
import { HostRepository } from '../../repositories/host-repository'

export type UpdateHostUseCaseRequest = {
	requesterId: string
	requesterRole: 'HOST' | 'GUEST' | 'ADMIN'
	hostId: string
	name?: string
	email?: string
	phone?: string
}

export type UpdateHostUseCaseResponse = Result<
	HostNotFoundError | InvalidEmailError | InvalidPhoneError | UnauthorizedError,
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
		if (input.requesterRole !== 'ADMIN' && input.requesterId !== input.hostId) {
			return failure(UnauthorizedError)
		}

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
