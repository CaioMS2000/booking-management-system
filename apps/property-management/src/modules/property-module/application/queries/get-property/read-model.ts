import { Email, Phone } from '@repo/core'
import { PropertyType } from '@/modules/property-module/domain/@types'
import { Address, Money } from '@/modules/property-module/domain/value-object'

export type PropertyReadModel = {
	name: string
	description: string
	capacity: number
	pricePerNight?: Money
	propertyType: PropertyType
	address: Address
	status: 'active' | 'inactive'
	imagesUrls: string[]
	host: {
		name: string
		email: Email
		phone: Phone
	}
}
