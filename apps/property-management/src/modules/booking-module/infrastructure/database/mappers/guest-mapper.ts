import { Email, Phone, UniqueId, Name } from '@repo/core'
import { Guest } from '@/modules/booking-module/domain/models/guest'
import type {
	GuestDrizzleInput,
	GuestDrizzleModel,
} from '../schemas/drizzle/guests'

export class GuestMapper {
	static toDomain(row: GuestDrizzleModel): Guest {
		const email = Email.create(row.email)
		if (email.isFailure()) {
			throw new Error(`Invalid email in database: ${row.email}`)
		}

		const phone = Phone.create(row.phone)
		if (phone.isFailure()) {
			throw new Error(`Invalid phone in database: ${row.phone}`)
		}

		return new Guest({
			id: UniqueId(row.id),
			name: Name(row.name),
			email: email.value,
			phone: phone.value,
		})
	}

	static toPersistence(guest: Guest): GuestDrizzleInput {
		return {
			id: guest.id,
			name: guest.name,
			email: guest.email.value,
			phone: guest.phone.value,
		}
	}
}
