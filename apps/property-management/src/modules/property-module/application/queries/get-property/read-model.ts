import { Email, Phone } from '@repo/core'
import { PropertyType } from '@/modules/property-module/domain/@types'
import { Address } from '@/modules/property-module/domain/value-object'

export type PropertyReadModel = {
	name: string
	description: string
	capacity: number
	propertyType: PropertyType
	address: Address
	imagesUrls: string[]
	host: {
		name: string
		email: Email
		phone: Phone
	}
}
