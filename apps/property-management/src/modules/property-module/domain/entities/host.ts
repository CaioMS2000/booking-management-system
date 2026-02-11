import { Entity } from '@repo/core'
import { Email, Phone } from '@repo/core'
import { UniqueEntityID } from '@repo/core'

export type HostProps = {
	name: string
	email: Email
	phone: Phone
	propertiesIds: UniqueEntityID[]
}

export type HostCreateInput = Omit<HostProps, 'propertiesIds'> & {
	id: UniqueEntityID
}

export class Host extends Entity<HostProps> {
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
		const { name, email, phone, id } = input

		return new Host(
			{
				name,
				email,
				phone,
				propertiesIds: [],
			},
			id
		)
	}
}
