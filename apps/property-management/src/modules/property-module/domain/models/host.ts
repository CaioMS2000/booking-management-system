import {
	Class,
	Email,
	IdGenerator,
	Optional,
	Phone,
	UniqueId,
} from '@repo/core'

export type HostProps = {
	id: UniqueId
	name: string
	email: Email
	phone: Phone
	propertiesIds: UniqueId[]
}

export type HostCreateInput = Omit<Optional<HostProps, 'propertiesIds'>, 'id'>

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

	get propertiesIds() {
		return this.props.propertiesIds
	}

	update(input: HostUpdateInput): Host {
		return new Host({
			...this.props,
			...input,
		})
	}

	static async create({ input, idGenerator, id }: CreateParams) {
		const { name, email, phone, propertiesIds = [] } = input

		if (!id) {
			id = await idGenerator.generate()
		}

		return new Host({
			id,
			name,
			email,
			phone,
			propertiesIds,
		})
	}
}
