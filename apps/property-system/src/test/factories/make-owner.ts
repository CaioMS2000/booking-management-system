import { appContext } from '@/application-context'
import { faker } from '@faker-js/faker'
import { Owner, OwnerCreateInput } from '@/domain/entities/owner'
import { makeEmail } from './make-email'
import { makePhone } from './make-phone'

export async function makeOwner(): Promise<Owner> {
	const context = appContext.get()
	const props: OwnerCreateInput = {
		id: await context.idGenerator.V4.generate(),
		name: faker.person.fullName(),
		email: makeEmail(),
		phone: makePhone(),
	}

	return Owner.create(props)
}
