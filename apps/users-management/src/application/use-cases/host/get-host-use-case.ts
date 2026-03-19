import { failure, Result, success, UniqueId, UseCase } from '@repo/core'
import { Host } from '@/domain/models/host'
import { HostNotFoundError, UnauthorizedError } from '../../@errors'
import { HostRepository } from '../../repositories/host-repository'

export type GetHostUseCaseRequest = {
	requesterId: string
	requesterRole: 'HOST' | 'GUEST' | 'ADMIN'
	hostId: string
}

export type GetHostUseCaseResponse = Result<
	HostNotFoundError | UnauthorizedError,
	{
		host: Host
	}
>

type UseCaseProps = {
	hostRepository: HostRepository
}

export class GetHostUseCase extends UseCase<
	GetHostUseCaseRequest,
	GetHostUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(input: GetHostUseCaseRequest): Promise<GetHostUseCaseResponse> {
		if (input.requesterRole !== 'ADMIN' && input.requesterId !== input.hostId) {
			return failure(UnauthorizedError)
		}

		const host = await this.props.hostRepository.findById(
			UniqueId(input.hostId)
		)

		if (!host) {
			return failure(HostNotFoundError)
		}

		return success({ host })
	}
}
