import { Entity } from '@repo/core'
import { Email, Phone } from '@repo/core/domain/value-objects'
import { UniqueEntityID } from '@repo/core/entity'

export type OwnerProps = {
	name: string
	email: Email
	phone: Phone
	propertiesIds: string[]
}
type OwnerCreateInput = Omit<OwnerProps, 'propertiesIds'> & {
	id: UniqueEntityID
}

export class Owner extends Entity<OwnerProps> {
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

	static create(input: OwnerCreateInput) {
		const { name, email, phone, id } = input

		return new Owner(
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
