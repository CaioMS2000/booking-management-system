import {
	Class,
	Email,
	IdGenerator,
	Optional,
	Phone,
	UniqueId,
} from '@repo/core'
import { BankCard } from '../value-object'

export type GuestProps = {
	id: UniqueId
	name: string
	email: Email
	phone: Phone
	bankCards: BankCard[]
	deletedAt: Date | null
}

export type GuestCreateInput = Optional<
	Omit<GuestProps, 'id'>,
	'bankCards' | 'deletedAt'
>

export type GuestUpdateInput = Partial<
	Pick<GuestProps, 'name' | 'email' | 'phone'>
>

type CreateParams = {
	idGenerator: IdGenerator
	input: GuestCreateInput
	id?: UniqueId
}

export class Guest extends Class<GuestProps> {
	constructor(protected readonly props: GuestProps) {
		super()
	}

	get id() {
		return this.props.id
	}

	get name() {
		return this.props.name
	}

	get email() {
		return this.props.email
	}

	get phone() {
		return this.props.phone
	}

	get bankCards() {
		return this.props.bankCards
	}

	get isDeleted() {
		return this.props.deletedAt !== null
	}

	get deletedAt() {
		return this.props.deletedAt
	}

	delete(): Guest {
		return new Guest({
			...this.props,
			deletedAt: new Date(),
		})
	}

	update(input: GuestUpdateInput): Guest {
		return new Guest({
			...this.props,
			...input,
		})
	}

	static async create({ input, idGenerator, id }: CreateParams) {
		if (!id) {
			id = await idGenerator.generate()
		}

		const { bankCards = [], deletedAt = null, ...rest } = input

		return new Guest({
			id,
			bankCards,
			deletedAt,
			...rest,
		})
	}
}
