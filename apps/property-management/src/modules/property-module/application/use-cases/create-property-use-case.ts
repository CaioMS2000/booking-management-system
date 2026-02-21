import {
	Result,
	failure,
	Name,
	UseCase,
	UniqueId,
	success,
	Address,
	PropertyType,
} from '@repo/core'
import { Property } from '../../domain'
import { HostNotFoundError } from '../@errors'
import { HostRepository } from '../repositories/host-repository'

export type CreatePropertyUseCaseRequest = {
	hostId: string
	name: Name
	description: string
	capacity: number
	propertyType: PropertyType
	address: Address
	imagesUrls: string[]
}

export type CreatePropertyUseCaseResponse = Result<
	HostNotFoundError,
	{
		property: Property
	}
>

type UseCaseProps = {
	hostRepository: HostRepository
}

export class CreatePropertyUseCase extends UseCase<
	CreatePropertyUseCaseRequest,
	CreatePropertyUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: CreatePropertyUseCaseRequest
	): Promise<CreatePropertyUseCaseResponse> {
		const {
			hostId,
			name,
			description,
			capacity,
			propertyType,
			address,
			imagesUrls,
		} = input
		const host = await this.props.hostRepository.findById(UniqueId(hostId))

		if (!host) {
			return failure(HostNotFoundError)
		}

		const property = await Property.create({
			hostId: UniqueId(hostId),
			name,
			description,
			capacity,
			propertyType,
			address,
			imagesUrls,
		})

		return success({ property })
	}
}
