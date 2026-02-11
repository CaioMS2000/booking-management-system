import { Either, InvalidValueError, UniqueEntityID } from '@repo/core'
import { resolveId } from '@/modules/property-module/application/utils/resolve-id'
import { Command } from '../../command'
import { RegisterHostReturnModel } from './return-model'

type RegisterHostCommandParams = {
	name: string
	email: string
	phone: string
}

export class RegisterHostCommand extends Command<
	Either<InvalidValueError, RegisterHostReturnModel>
> {
	readonly params: RegisterHostCommandParams

	get name() {
		return this.params.name
	}

	get email() {
		return this.params.email
	}

	get phone() {
		return this.params.phone
	}

	static async create(
		params: RegisterHostCommandParams,
		id?: UniqueEntityID
	): Promise<RegisterHostCommand> {
		const resolvedId = await resolveId(id)
		return new RegisterHostCommand(resolvedId, params)
	}

	protected constructor(id: UniqueEntityID, params: RegisterHostCommandParams) {
		super(id)
		this.params = params
	}
}
