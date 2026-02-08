import { Entity, Optional, UniqueEntityID } from '@repo/core'
import { appContext } from '@/application-context'
import { PropertyType } from '../@types'
import { Address, Money } from '../value-object'

type PropertyProps = {
	name: string
	description: string
	capacity: number
	pricePerNight?: Money
	propertyType: PropertyType
	address: Address
	status: 'active' | 'inactive'
	imagesUrls: string[]
}
type PropertyCreateInput = Optional<PropertyProps, 'status' | 'imagesUrls'> & {
	id: UniqueEntityID
}

export class Property extends Entity<PropertyProps> {
	// get name() {
	// 	return this.props.name
	// }

	// get description() {
	// 	return this.props.description
	// }

	// get capacity() {
	// 	return this.props.capacity
	// }

	// get pricePerNight() {
	// 	return this.props.pricePerNight
	// }

	// get type() {
	// 	return this.props.propertyType
	// }

	// get address() {
	// 	return this.props.address
	// }

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

	static create(input: PropertyCreateInput) {
		let {
			id,
			name,
			description,
			capacity,
			pricePerNight,
			address,
			propertyType,
			status = 'active',
			imagesUrls = [],
		} = input

		if (!pricePerNight) {
			status = 'inactive'
		}

		return new Property(
			{
				name,
				description,
				capacity,
				pricePerNight,
				address,
				propertyType,
				status,
				imagesUrls,
			},
			id
		)
	}
}
