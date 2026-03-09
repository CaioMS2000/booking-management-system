import {
	Class,
	Email,
	IdGenerator,
	Optional,
	Phone,
	UniqueId,
} from '@repo/core'
import { BankAccount, BankCard } from '../value-object'

export type HostProps = {
	id: UniqueId
	name: string
	email: Email
	phone: Phone
	bankAccount: BankAccount
	bankCards: BankCard[]
	deletedAt: Date | null
}

export type HostCreateInput = Optional<
	Omit<HostProps, 'id'>,
	'bankCards' | 'deletedAt'
>

export type HostUpdateInput = Partial<
	Pick<HostProps, 'name' | 'email' | 'phone'>
>

type CreateParams = {
	idGenerator: IdGenerator
	input: HostCreateInput
	id?: UniqueId
}

export class Host extends Class<HostProps> {
	constructor(protected readonly props: HostProps) {
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

	get isDeleted() {
		return this.props.deletedAt !== null
	}

	get deletedAt() {
		return this.props.deletedAt
	}

	delete(): Host {
		return new Host({
			...this.props,
			deletedAt: new Date(),
		})
	}

	update(input: HostUpdateInput): Host {
		return new Host({
			...this.props,
			...input,
		})
	}

	static async create({ input, idGenerator, id }: CreateParams) {
		if (!id) {
			id = await idGenerator.generate()
		}

		const { bankCards = [], deletedAt = null, ...rest } = input

		return new Host({
			id,
			bankCards,
			deletedAt,
			...rest,
		})
	}
}
