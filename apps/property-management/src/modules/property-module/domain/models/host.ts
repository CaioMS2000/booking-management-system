import { Class, Email, Optional, Phone, UniqueId } from '@repo/core'

export type HostProps = {
	id: UniqueId
	name: string
	email: Email
	phone: Phone
	propertiesIds: UniqueId[]
}

export type HostCreateInput = Optional<HostProps, 'propertiesIds'>

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

	static create(input: HostCreateInput) {
		const { name, email, phone, id, propertiesIds = [] } = input

		return new Host({
			id,
			name,
			email,
			phone,
			propertiesIds,
		})
	}
}
