import {
	Result,
	failure,
	UseCase,
	UniqueId,
	success,
	Address,
	PropertyType,
} from '@repo/core'
import { Property } from '../../domain'
import {
	HostNotFoundError,
	PropertyNotFoundError,
	PropertyNotOwnedByHostError,
} from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { PropertyRepository } from '../repositories/property-repository'

export type UpdatePropertyUseCaseRequest = {
	propertyId: string
	hostId: string
	name?: string
	description?: string
	capacity?: number
	propertyType?: PropertyType
	address?: Address
	imagesUrls?: string[]
}

export type UpdatePropertyUseCaseResponse = Result<
	HostNotFoundError | PropertyNotFoundError | PropertyNotOwnedByHostError,
	{
		property: Property
	}
>

type UseCaseProps = {
	hostRepository: HostRepository
	propertyRepository: PropertyRepository
}

export class UpdatePropertyUseCase extends UseCase<
	UpdatePropertyUseCaseRequest,
	UpdatePropertyUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: UpdatePropertyUseCaseRequest
	): Promise<UpdatePropertyUseCaseResponse> {
		const host = await this.props.hostRepository.findById(
			UniqueId(input.hostId)
		)

		if (!host) {
			return failure(HostNotFoundError)
		}

		const property = await this.props.propertyRepository.findById(
			UniqueId(input.propertyId)
		)

		if (!property) {
			return failure(PropertyNotFoundError)
		}

		if (property.hostId !== UniqueId(input.hostId)) {
			return failure(PropertyNotOwnedByHostError)
		}

		const updateFields: Record<string, unknown> = {}
		if (input.name !== undefined) updateFields.name = input.name
		if (input.description !== undefined)
			updateFields.description = input.description
		if (input.capacity !== undefined) updateFields.capacity = input.capacity
		if (input.propertyType !== undefined)
			updateFields.propertyType = input.propertyType
		if (input.address !== undefined) updateFields.address = input.address
		if (input.imagesUrls !== undefined)
			updateFields.imagesUrls = input.imagesUrls

		const updatedProperty = property.update(updateFields)

		await this.props.propertyRepository.update(updatedProperty)

		return success({ property: updatedProperty })
	}
}
