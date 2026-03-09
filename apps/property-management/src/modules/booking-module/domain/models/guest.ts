import { Class, Email, IdGenerator, Name, Phone, UniqueId } from '@repo/core'

export type GuestProps = {
	id: UniqueId
	name: Name
	email: Email
	phone: Phone
}

export type GuestCreateInput = Omit<GuestProps, 'id'>

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

	update(input: GuestUpdateInput): Guest {
		return new Guest({
			...this.props,
			...input,
		})
	}

	static async create({ input, idGenerator, id }: CreateParams) {
		const { name, email, phone } = input

		if (!id) {
			id = await idGenerator.generate()
		}

		return new Guest({
			id,
			name,
			email,
			phone,
		})
	}
}
