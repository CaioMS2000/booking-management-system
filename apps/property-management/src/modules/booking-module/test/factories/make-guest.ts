import { Email, IdGenerator, Name, Phone } from '@repo/core'
import {
	Guest,
	GuestCreateInput,
} from '@/modules/booking-module/domain/models/guest'
import { FakeIdGenerator } from '@/modules/property-module/test/fake-id-generator'

type MakeGuestParams = {
	overrides?: Partial<GuestCreateInput>
	idGenerator?: IdGenerator
}

export async function makeGuest({
	overrides,
	idGenerator,
}: MakeGuestParams = {}): Promise<Guest> {
	const props: GuestCreateInput = {
		name: Name('John Doe'),
		email: Email.create('john@example.com').value as Email,
		phone: Phone.create('+5511999999999').value as Phone,
		...overrides,
	}

	return Guest.create({
		input: props,
		idGenerator: idGenerator ?? new FakeIdGenerator(),
	})
}
