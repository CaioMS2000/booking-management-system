import { failure, Result, success, UniqueId, UseCase } from '@repo/core'
import { Host } from '@/domain/models/host'
import { HostNotFoundError } from '../../@errors'
import { HostRepository } from '../../repositories/host-repository'

export type DeleteHostUseCaseRequest = {
	hostId: string
}

export type DeleteHostUseCaseResponse = Result<HostNotFoundError, Host>

type UseCaseProps = {
	hostRepository: HostRepository
}

export class DeleteHostUseCase extends UseCase<
	DeleteHostUseCaseRequest,
	DeleteHostUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: DeleteHostUseCaseRequest
	): Promise<DeleteHostUseCaseResponse> {
		const host = await this.props.hostRepository.findById(
			UniqueId(input.hostId)
		)

		if (!host) {
			return failure(HostNotFoundError)
		}

		const deletedHost = host.delete()
		await this.props.hostRepository.delete(deletedHost)
		return success(deletedHost)
	}
}
