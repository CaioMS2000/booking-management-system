import { faker } from '@faker-js/faker'
import { IdGenerator } from '@repo/core'
import { Admin, AdminCreateInput } from '@/domain/models/admin'
import { FakeIdGenerator } from '../fake-id-generator'
import { makeEmail } from './make-email'
import { makePhone } from './make-phone'

type MakeAdminParams = {
	idGenerator?: IdGenerator
}

export async function makeAdmin({
	idGenerator,
}: MakeAdminParams = {}): Promise<Admin> {
	const props: AdminCreateInput = {
		name: faker.person.fullName(),
		email: makeEmail(),
		phone: makePhone(),
	}

	return Admin.create({
		input: props,
		idGenerator: idGenerator ?? new FakeIdGenerator(),
	})
}
