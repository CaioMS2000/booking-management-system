import { faker } from '@faker-js/faker'
import { IdGenerator } from '@repo/core'
import {
	Host,
	HostCreateInput,
} from '@/modules/property-module/domain/models/host'
import { FakeIdGenerator } from '../fake-id-generator'
import { makeEmail } from './make-email'
import { makePhone } from './make-phone'

type MakeHostParams = {
	idGenerator?: IdGenerator
}

export async function makeHost({
	idGenerator,
}: MakeHostParams = {}): Promise<Host> {
	const props: HostCreateInput = {
		name: faker.person.fullName(),
		email: makeEmail(),
		phone: makePhone(),
	}

	return Host.create({
		input: props,
		idGenerator: idGenerator ?? new FakeIdGenerator(),
	})
}
