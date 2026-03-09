import { IdGenerator, UniqueId, ValueObject } from '@repo/core'

type BankCardValue = {
	bankAccountId: string
	userId: UniqueId
	cardNumber: string
	cvv: string
	blocked: boolean
	expiresAt: {
		month: number
		year: number
	}
	createdAt: Date
	updatedAt: Date
}

type CreateParams = {
	value: BankCardValue
	idGenerator: IdGenerator
	id?: UniqueId
}
export class BankCard extends ValueObject<BankCardValue> {
	private _id: UniqueId

	get id() {
		return this._id
	}

	protected constructor(value: BankCardValue, id: UniqueId) {
		super(value)
		this._id = id
	}

	static async create({ value, idGenerator, id }: CreateParams) {
		if (!id) {
			id = await idGenerator.generate()
		}

		return new BankCard(value, id)
	}
}
