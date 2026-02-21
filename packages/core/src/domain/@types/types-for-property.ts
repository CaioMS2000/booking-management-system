export type Address = {
	street: string
	city: string
	country: string
	state: string
	zipCode: string
}

export const PropertyType = ['Apartment', 'House', 'Room'] as const
export type PropertyType = (typeof PropertyType)[number]
