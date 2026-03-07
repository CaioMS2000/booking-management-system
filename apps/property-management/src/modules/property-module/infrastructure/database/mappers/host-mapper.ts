import { Email, Phone, UniqueId } from '@repo/core'
import { Host } from '@/modules/property-module/domain/models/host'
import type {
	HostDrizzleInput,
	HostDrizzleModel,
} from '../schemas/drizzle/hosts'

export class HostMapper {
	static toDomain(row: HostDrizzleModel, propertiesIds: string[]): Host {
		const email = Email.create(row.email)
		if (email.isFailure()) {
			throw new Error(`Invalid email in database: ${row.email}`)
		}

		const phone = Phone.create(row.phone)
		if (phone.isFailure()) {
			throw new Error(`Invalid phone in database: ${row.phone}`)
		}

		return new Host({
			id: UniqueId(row.id),
			name: row.name,
			email: email.value,
			phone: phone.value,
			propertiesIds: propertiesIds.map(UniqueId),
		})
	}

	static toPersistence(host: Host): HostDrizzleInput {
		return {
			id: host.id,
			name: host.name,
			email: host.email.value,
			phone: host.phone.value,
		}
	}
}
