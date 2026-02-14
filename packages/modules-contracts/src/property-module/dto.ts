import { Address, PropertyType } from './types'

export type PropertyDTO = {
	hostId: string
	publicId: number
	name: string
	description: string
	capacity: number
	propertyType: PropertyType
	address: Address
	imagesUrls: string[]
}
