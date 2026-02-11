import { Either, InvalidValueError, UniqueEntityID } from '@repo/core'
import { resolveId } from '@/application/utils/resolve-id'
import { Command } from '../../command'
import { RegisterOwnerReturnModel } from './return-model'

type RegisterOwnerCommandParams = {
	name: string
	email: string
	phone: string
}

export class RegisterOwnerCommand extends Command<
	Either<InvalidValueError, RegisterOwnerReturnModel>
> {
	readonly params: RegisterOwnerCommandParams

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
		params: RegisterOwnerCommandParams,
		id?: UniqueEntityID
	): Promise<RegisterOwnerCommand> {
		const resolvedId = await resolveId(id)
		return new RegisterOwnerCommand(resolvedId, params)
	}

	protected constructor(
		id: UniqueEntityID,
		params: RegisterOwnerCommandParams
	) {
		super(id)
		this.params = params
	}
}
