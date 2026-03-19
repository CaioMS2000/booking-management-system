import { Result, failure, UseCase, UniqueId, success } from '@repo/core'
import { Property } from '../../../domain'
import { HostNotFoundError, PropertyNotFoundError } from '../../@errors'
import { HostRepository } from '../../repositories/host-repository'
import { PropertyRepository } from '../../repositories/property-repository'

export type GetMyPropertyUseCaseRequest = {
	hostId: string
	propertyId: string
}

export type GetMyPropertyUseCaseResponse = Result<
	HostNotFoundError | PropertyNotFoundError,
	{
		property: Property
	}
>

type UseCaseProps = {
	hostRepository: HostRepository
	propertyRepository: PropertyRepository
}

export class GetMyPropertyUseCase extends UseCase<
	GetMyPropertyUseCaseRequest,
	GetMyPropertyUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: GetMyPropertyUseCaseRequest
	): Promise<GetMyPropertyUseCaseResponse> {
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
