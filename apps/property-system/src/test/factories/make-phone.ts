import { faker } from '@faker-js/faker'
import { Phone } from '@repo/core'

export function makePhone(phone = faker.phone.number()): Phone {
	return Phone.create(phone)
}
