import { Entity } from '@repo/core'
import { PropertyType } from '../@types'
import { Address, Money } from '../value-object'

type PropertyProps = {
	name: string
	description: string
	capacity: number
	pricePerNight: Money
	propertyType: PropertyType
	address: Address
	status: 'active' | 'inactive'
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
		const totalCents = this.props.pricePerNight.getAmount() * nights
		return Money.create({
			valueInCents: totalCents,
			currency: this.props.pricePerNight.getCurrency(),
		})
	}
}
