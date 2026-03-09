import { faker } from '@faker-js/faker'
import { IdGenerator } from '@repo/core'
import { Guest, GuestCreateInput } from '@/domain/models/guest'
import { FakeIdGenerator } from '../fake-id-generator'
import { makeEmail } from './make-email'
import { makePhone } from './make-phone'

type MakeGuestParams = {
	idGenerator?: IdGenerator
}

export async function makeGuest({
	idGenerator,
}: MakeGuestParams = {}): Promise<Guest> {
	const props: GuestCreateInput = {
		name: faker.person.fullName(),
		email: makeEmail(),
		phone: makePhone(),
	}

	return Guest.create({
		input: props,
		idGenerator: idGenerator ?? new FakeIdGenerator(),
	})
}
