import { Email, Name, Phone } from '@repo/core'
import {
	Guest,
	GuestCreateInput,
} from '@/modules/booking-module/domain/models/guest'

export async function makeGuest(
	overrides?: Partial<GuestCreateInput>
): Promise<Guest> {
	const props: GuestCreateInput = {
		name: Name('John Doe'),
		email: Email.create('john@example.com').value as Email,
		phone: Phone.create('+5511999999999').value as Phone,
		...overrides,
	}

	return Guest.create(props)
}
