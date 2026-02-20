import { Class, DateInterval, Money, Optional, UniqueId } from '@repo/core'

export type ListingProps = {
	id: UniqueId
	propertyId: UniqueId
	publicId: number
	pricePerNight: Money
	intervals: DateInterval[]
}

export type ListingCreateInput = Optional<ListingProps, 'intervals'>

export class Listing extends Class<ListingProps> {
	constructor(protected readonly props: ListingProps) {
		super()
	}

	static create(input: ListingCreateInput) {
		const { id, pricePerNight, publicId, propertyId, intervals = [] } = input

		return new Listing({
			id,
			propertyId,
			pricePerNight,
			publicId,
			intervals,
		})
	}
}
