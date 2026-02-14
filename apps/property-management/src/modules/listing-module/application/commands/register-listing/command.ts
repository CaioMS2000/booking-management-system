import { Either, InvalidValueError, UniqueEntityID } from '@repo/core'
import { resolveId } from '@/modules/listing-module/application/utils/resolve-id'
import { Command } from '../../command'
import { RegisterListingReturnModel } from './return-model'
import { Money } from '@/modules/listing-module/domain'

type RegisterListingCommandParams = {
	hostId: UniqueEntityID
	propertyId: UniqueEntityID
	pricePerNight: Money
}

export class RegisterListingCommand extends Command<
	Either<null, RegisterListingReturnModel>
> {
	readonly params: RegisterListingCommandParams

	static async create(
		params: RegisterListingCommandParams,
		id?: UniqueEntityID
	): Promise<RegisterListingCommand> {
		const resolvedId = await resolveId(id)
		return new RegisterListingCommand(resolvedId, params)
	}

	protected constructor(
		id: UniqueEntityID,
		params: RegisterListingCommandParams
	) {
		super(id)
		this.params = params
	}
}
