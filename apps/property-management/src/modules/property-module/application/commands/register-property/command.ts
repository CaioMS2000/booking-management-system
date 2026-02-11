import { Either, InvalidValueError, UniqueEntityID } from '@repo/core'
import type { PropertyType } from '@/domain/@types'
import type { AddressProps } from '@/domain/value-object/address'
import type { MoneyProps } from '@/domain/value-object/money'
import { OwnerNotFoundError } from '@/modules/property-module/application/@errors'
import { resolveId } from '@/modules/property-module/application/utils/resolve-id'
import { Command } from '../../command'
import { RegisterPropertyReturnModel } from './return-model'

type RegisterPropertyCommandParams = {
	ownerId: UniqueEntityID
	publicId: number
	name: string
	description: string
	capacity: number
	pricePerNight?: MoneyProps
	propertyType: PropertyType
	address: AddressProps
	status?: 'active' | 'inactive'
	imagesUrls?: string[]
}

export class RegisterPropertyCommand extends Command<
	Either<InvalidValueError | OwnerNotFoundError, RegisterPropertyReturnModel>
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
