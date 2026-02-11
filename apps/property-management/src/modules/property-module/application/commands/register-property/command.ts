import { Either, InvalidValueError, UniqueEntityID } from '@repo/core'
import type { PropertyType } from '@/modules/property-module/domain/@types'
import type { AddressProps } from '@/modules/property-module/domain/value-object/address'
import { HostNotFoundError } from '@/modules/property-module/application/@errors'
import { resolveId } from '@/modules/property-module/application/utils/resolve-id'
import { Command } from '../../command'
import { RegisterPropertyReturnModel } from './return-model'

type RegisterPropertyCommandParams = {
	hostId: UniqueEntityID
	publicId: number
	name: string
	description: string
	capacity: number
	propertyType: PropertyType
	address: AddressProps
	imagesUrls?: string[]
}

export class RegisterPropertyCommand extends Command<
	Either<InvalidValueError | HostNotFoundError, RegisterPropertyReturnModel>
> {
	readonly params: RegisterPropertyCommandParams

	static async create(
		params: RegisterPropertyCommandParams,
		id?: UniqueEntityID
	): Promise<RegisterPropertyCommand> {
		const resolvedId = await resolveId(id)
		return new RegisterPropertyCommand(resolvedId, params)
	}

	protected constructor(
		id: UniqueEntityID,
		params: RegisterPropertyCommandParams
	) {
		super(id)
		this.params = params
	}
}
