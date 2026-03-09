import { IdGenerator, UniqueId, ValueObject } from '@repo/core'

type BankAccountValue = {
	userId: UniqueId
	name: string
	code: string
	agency: string
	agencyId: string // dígito verificador
	accountNumber: string
	createdAt: Date
	updatedAt: Date
}

type CreateParams = {
	value: BankAccountValue
	idGenerator: IdGenerator
	id?: UniqueId
}
export class BankAccount extends ValueObject<BankAccountValue> {
	private _id: UniqueId

	get id() {
		return this._id
	}

	protected constructor(value: BankAccountValue, id: UniqueId) {
		super(value)
		this._id = id
	}

	static async create({ value, idGenerator, id }: CreateParams) {
		if (!id) {
			id = await idGenerator.generate()
		}

		return new BankAccount(value, id)
	}
}
