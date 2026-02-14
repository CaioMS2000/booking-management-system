import { Entity, Optional, UniqueEntityID } from '@repo/core'
import { Money } from '../value-object/money'
import { DateInterval } from '../@types/date-interval'

export type ListingProps = {
	propertyId: UniqueEntityID
	publicId: number
	pricePerNight: Money
	intervals: DateInterval[]
}

export type ListingCreateInput = Optional<ListingProps, 'intervals'> & {
	id: UniqueEntityID
}

export class Listing extends Entity<ListingProps> {
	calculateTotalPrice(nights: number): Money {
		const moneyAmount = this.props.pricePerNight.getAmount()
		const currency = this.props.pricePerNight.getCurrency()
		const totalCents = moneyAmount * nights

		return Money.create({
			valueInCents: totalCents,
			currency: currency,
		})
	}

	static create(input: ListingCreateInput) {
		const { id, pricePerNight, publicId, propertyId, intervals = [] } = input

		return new Listing(
			{
				propertyId,
				pricePerNight,
				publicId,
				intervals,
			},
			id
		)
	}
}
