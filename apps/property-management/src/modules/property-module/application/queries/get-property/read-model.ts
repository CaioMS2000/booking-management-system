import { Email, Phone } from '@repo/core'
import { PropertyType } from '@/modules/property-module/domain/@types'
import { Address } from '@/modules/property-module/domain/value-object'

export type PropertyReadModel = {
	id: string
	name: string
	description: string
	capacity: number
	publicId: number
	propertyType: PropertyType
	address: Address
	imagesUrls: string[]
	host: {
		id: string
		name: string
		email: Email
		phone: Phone
	}
}
