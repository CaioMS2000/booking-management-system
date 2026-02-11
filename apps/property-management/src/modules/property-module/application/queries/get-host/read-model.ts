import { Email, Phone, UniqueEntityID } from '@repo/core'

export type HostReadModel = {
	name: string
	email: Email
	phone: Phone
	propertiesIds: UniqueEntityID[]
}
