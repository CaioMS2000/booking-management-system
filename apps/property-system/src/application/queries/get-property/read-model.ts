import { Email, Phone } from '@repo/core'
import { PropertyType } from '@/domain/@types'
import { Address, Money } from '@/domain/value-object'

export type NullablePropertyReadModel = {
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
} | null
