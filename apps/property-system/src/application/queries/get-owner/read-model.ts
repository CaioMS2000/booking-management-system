import { Email, Phone, UniqueEntityID } from '@repo/core'

export type OwnerReadModel = {
	name: string
	email: Email
	phone: Phone
	propertiesIds: UniqueEntityID[]
}
