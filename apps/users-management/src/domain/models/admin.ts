import {
	Class,
	Email,
	IdGenerator,
	Optional,
	Phone,
	UniqueId,
} from '@repo/core'

export type AdminProps = {
	id: UniqueId
	name: string
	email: Email
	phone: Phone
	deletedAt: Date | null
}

export type AdminCreateInput = Optional<Omit<AdminProps, 'id'>, 'deletedAt'>

export type AdminUpdateInput = Partial<
	Pick<AdminProps, 'name' | 'email' | 'phone'>
>

type CreateParams = {
	idGenerator: IdGenerator
	input: AdminCreateInput
	id?: UniqueId
}

export class Admin extends Class<AdminProps> {
	constructor(protected readonly props: AdminProps) {
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

	delete(): Admin {
		return new Admin({
			...this.props,
			deletedAt: new Date(),
		})
	}

	update(input: AdminUpdateInput): Admin {
		return new Admin({
			...this.props,
			...input,
		})
	}

	static async create({ input, idGenerator, id }: CreateParams) {
		if (!id) {
			id = await idGenerator.generate()
		}

		const { deletedAt = null, ...rest } = input

		return new Admin({
			id,
			deletedAt,
			...rest,
		})
	}
}
