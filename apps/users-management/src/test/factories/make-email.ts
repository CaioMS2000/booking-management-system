import { Email } from '@repo/core'
import { faker } from '@faker-js/faker'

export function makeEmail(email = faker.internet.email()): Email {
	const result = Email.create(email)

	if (result.isFailure()) {
		throw result.value
	}

	return result.value
}
