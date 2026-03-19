import { Result, failure, UseCase, UniqueId, success } from '@repo/core'
import { Property } from '../../../domain'
import { HostNotFoundError, PropertyNotFoundError } from '../../@errors'
import { HostRepository } from '../../repositories/host-repository'
import { PropertyRepository } from '../../repositories/property-repository'

export type GetMyPropertiesUseCaseRequest = {
	hostId: string
}

export type GetMyPropertiesUseCaseResponse = Result<
	HostNotFoundError | PropertyNotFoundError,
	{
		properties: Property[]
	}
>

type UseCaseProps = {
	hostRepository: HostRepository
	propertyRepository: PropertyRepository
}

export class GetMyPropertiesUseCase extends UseCase<
	GetMyPropertiesUseCaseRequest,
	GetMyPropertiesUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: GetMyPropertiesUseCaseRequest
	): Promise<GetMyPropertiesUseCaseResponse> {
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
