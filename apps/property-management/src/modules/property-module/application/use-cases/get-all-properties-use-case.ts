import { Result, failure, UseCase, UniqueId, success } from '@repo/core'
import { Property } from '../../domain'
import { HostNotFoundError, PropertyNotFoundError } from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { PropertyRepository } from '../repositories/property-repository'

export type GetPropertyUseCaseRequest = {
	hostId: string
}

export type GetPropertyUseCaseResponse = Result<
	HostNotFoundError | PropertyNotFoundError,
	{
		properties: Property[]
	}
>

type UseCaseProps = {
	hostRepository: HostRepository
	propertyRepository: PropertyRepository
}

export class GetAllPropertiesUseCase extends UseCase<
	GetPropertyUseCaseRequest,
	GetPropertyUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: GetPropertyUseCaseRequest
	): Promise<GetPropertyUseCaseResponse> {
		const { hostId } = input
		const host = await this.props.hostRepository.findById(UniqueId(hostId))

		if (!host) {
			return failure(HostNotFoundError)
		}

		const properties = await this.props.propertyRepository.findManyByHostId(
			UniqueId(hostId)
		)

		return success({ properties })
	}
}
