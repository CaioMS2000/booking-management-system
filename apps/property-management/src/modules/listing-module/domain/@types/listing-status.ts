export const ListingStatus = [
	'AVAILABLE',
	'BLOCKED',
	'HOLD',
	'RESERVED',
] as const
export type ListingStatus = (typeof ListingStatus)[number]
