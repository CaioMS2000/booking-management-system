import { faker } from '@faker-js/faker'
import {
	Host,
	HostCreateInput,
} from '@/modules/property-module/domain/models/host'
import { makeEmail } from './make-email'
import { makePhone } from './make-phone'

export async function makeHost(): Promise<Host> {
	const props: HostCreateInput = {
		name: faker.person.fullName(),
		email: makeEmail(),
		phone: makePhone(),
	}

	return Host.create(props)
}
