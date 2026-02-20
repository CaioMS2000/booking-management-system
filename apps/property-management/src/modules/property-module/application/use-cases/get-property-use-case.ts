import { Result, failure, UseCase, UniqueId, success } from '@repo/core'
import { Property } from '../../domain'
import { HostNotFoundError, PropertyNotFoundError } from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { PropertyRepository } from '../repositories/property-repository'

export type GetPropertyUseCaseRequest = {
	hostId: string
	propertyId: string
}

export type GetPropertyUseCaseResponse = Result<
	HostNotFoundError | PropertyNotFoundError,
	{
		property: Property
	}
>

type UseCaseProps = {
	hostRepository: HostRepository
	propertyRepository: PropertyRepository
}

export class GetPropertyUseCase extends UseCase<
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
		const { hostId, propertyId } = input
		const host = await this.props.hostRepository.findById(UniqueId(hostId))

		if (!host) {
			return failure(HostNotFoundError)
		}

		const property = await this.props.propertyRepository.findById(
			UniqueId(propertyId)
		)

		if (!property) {
			return failure(PropertyNotFoundError)
		}

		return success({ property })
	}
}
