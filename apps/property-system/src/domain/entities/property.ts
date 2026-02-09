import { Entity, Optional, UniqueEntityID } from '@repo/core'
import { appContext } from '@/application-context'
import { PropertyType } from '../@types'
import { Address, Money } from '../value-object'

export type PropertyProps = {
	ownerId: UniqueEntityID
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
	get ownerId() {
		return this.props.ownerId
	}

	get name() {
		return this.props.name
	}

	get description() {
		return this.props.description
	}

	get capacity() {
		return this.props.capacity
	}

	get pricePerNight() {
		return this.props.pricePerNight
	}

	get type() {
		return this.props.propertyType
	}

	get address() {
		return this.props.address
	}

	get status() {
		return this.props.status
	}

	get imagesUrls() {
		return this.props.imagesUrls
	}

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
			ownerId,
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
				ownerId,
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
