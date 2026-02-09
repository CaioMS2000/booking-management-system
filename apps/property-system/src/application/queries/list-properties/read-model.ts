import { Address, Money } from '@/domain/value-object'
import { PropertyType } from '@/domain/@types'
import { Email, Phone } from '@repo/core/domain/value-objects'

export type PropertyWithOwnerReadModel = {
	name: string
	description: string
	capacity: number
	pricePerNight?: Money
	propertyType: PropertyType
	address: Address
	status: 'active' | 'inactive'
	imagesUrls: string[]
	owner: {
		name: string
		email: Email
		phone: Phone
	}
}
