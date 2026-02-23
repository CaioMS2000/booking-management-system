import { Address, DateInterval, Money, PropertyType } from '@repo/core'

export type PropertyDTO = {
	id: string
	hostId: string
	publicId: number
	name: string
	description: string
	capacity: number
	propertyType: PropertyType
	address: Address
	imagesUrls: string[]
}

export type ListingDTO = {
	id: string
	publicId: number
	pricePerNight: Money
	intervals: DateInterval[]
	deletedAt: Date | null
}
