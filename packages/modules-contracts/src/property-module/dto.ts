import { Address, PropertyType } from '@repo/core'

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
