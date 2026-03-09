import { Phone } from '@repo/core'

export function makePhone(phone = '5599999999999'): Phone {
	const result = Phone.create(phone)

	if (result.isFailure()) {
		throw new Error(
			`Failed to create Phone in test factory: ${result.value.message}`
		)
	}

	return result.value
}
