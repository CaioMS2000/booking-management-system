import { faker } from '@faker-js/faker'
import { Address } from '@repo/core'

export function makeAddress(): Address {
	// const props: AddressProps = {
	// 	street: 'Rua das Flores, 123',
	// 	city: 'São Paulo',
	// 	state: 'SP',
	// 	country: 'BR',
	// 	zipCode: '01234567',
	// }

	return {
		street: faker.location.street(),
		city: faker.location.city(),
		state: faker.location.state(),
		country: faker.location.countryCode(),
		zipCode: faker.location.zipCode(),
	}
}
