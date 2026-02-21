import { Result, failure, UseCase, UniqueId, success } from '@repo/core'
import { Host } from '../../domain/models/host'
import { HostNotFoundError } from '../@errors'
import { HostRepository } from '../repositories/host-repository'

export type GetHostUseCaseRequest = {
	hostId: string
}

export type GetHostUseCaseResponse = Result<
	HostNotFoundError,
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
		const host = await this.props.hostRepository.findById(
			UniqueId(input.hostId)
		)

		if (!host) {
			return failure(HostNotFoundError)
		}

		return success({ host })
	}
}
