import { Class, Email, Name, Phone, UniqueId } from '@repo/core'
import { appContext } from '@/context/application-context'

export type GuestProps = {
	id: UniqueId
	name: Name
	email: Email
	phone: Phone
}

export type GuestCreateInput = Omit<GuestProps, 'id'>

export class Guest extends Class<GuestProps> {
	constructor(protected readonly props: GuestProps) {
		super()
	}

	get id() {
		return this.props.id
	}

	static async create(input: GuestCreateInput, id?: UniqueId) {
		const { name, email, phone } = input

		if (!id) {
			const context = appContext.get()
			id = await context.idGenerator.V7.generate()
		}

		return new Guest({
			id,
			name,
			email,
			phone,
		})
	}
}
