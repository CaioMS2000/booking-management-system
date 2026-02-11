import { Entity, Optional, UniqueEntityID } from '@repo/core'
import { Money } from '../value-object/money'
import { appContext } from '@/application-context'

export type ListingProps = {
	propertyId: UniqueEntityID
	publicId: number
	pricePerNight?: Money
	status: 'active' | 'inactive'
}

export type ListingCreateInput = Optional<ListingProps, 'status'> & {
	id: UniqueEntityID
}

export class Listing extends Entity<ListingProps> {
	calculateTotalPrice(nights: number): Money {
		const context = appContext.get()
		const moneyAmount = this.props.pricePerNight?.getAmount() ?? 0
		const currency =
			this.props.pricePerNight?.getCurrency() ?? context.currentCurrency
		const totalCents = moneyAmount * nights

		return Money.create({
			valueInCents: totalCents,
			currency: currency,
		})
	}

	static create(input: ListingCreateInput) {
		let { id, pricePerNight, publicId, propertyId, status = 'active' } = input

		if (!pricePerNight) {
			status = 'inactive'
		}

		return new Listing(
			{
				propertyId,
				pricePerNight,
				publicId,
				status,
			},
			id
		)
	}
}
