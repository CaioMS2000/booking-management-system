import { faker } from '@faker-js/faker'
import { Address, AddressProps } from '@/modules/property-module/domain'

export function makeAddress(): Address {
	const props: AddressProps = {
		street: faker.location.street(),
		city: faker.location.city(),
		state: faker.location.state(),
		country: faker.location.countryCode(),
		zipCode: faker.location.zipCode(),
	}

	return Address.create(props)
}
