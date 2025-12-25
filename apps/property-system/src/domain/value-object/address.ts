import { ValueObject } from '@repo/core'

export type AddressProps = {
	street: string
	city: string
	country: string
	state: string
	zipCode: string
}

export class Address extends ValueObject<AddressProps> {
	get street() {
		return this._value.street
	}

	get city() {
		return this._value.city
	}

	get country() {
		return this._value.country
	}

	get state() {
		return this._value.state
	}

	get zipCode() {
		return this._value.zipCode
	}
}
