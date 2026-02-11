import { faker } from '@faker-js/faker'
import { appContext } from '@/application-context'
import {
	Host,
	HostCreateInput,
} from '@/modules/property-module/domain/entities/host'
import { makeEmail } from './make-email'
import { makePhone } from './make-phone'

export async function makeHost(): Promise<Host> {
	const context = appContext.get()
	const props: HostCreateInput = {
		id: await context.idGenerator.V4.generate(),
		name: faker.person.fullName(),
		email: makeEmail(),
		phone: makePhone(),
	}

	return Host.create(props)
}
