import { faker } from '@faker-js/faker'
import { IdGenerator } from '@repo/core'
import { Host, HostCreateInput } from '@/domain/models/host'
import { BankAccount } from '@/domain/value-object'
import { FakeIdGenerator } from '../fake-id-generator'
import { makeBankAccount } from './make-bank-account'
import { makeEmail } from './make-email'
import { makePhone } from './make-phone'

type MakeHostParams = {
	idGenerator?: IdGenerator
	bankAccount?: BankAccount
}

export async function makeHost({
	idGenerator,
	bankAccount,
}: MakeHostParams = {}): Promise<Host> {
	const props: HostCreateInput = {
		name: faker.person.fullName(),
		email: makeEmail(),
		phone: makePhone(),
		bankAccount: bankAccount ?? (await makeBankAccount()),
	}

	return Host.create({
		input: props,
		idGenerator: idGenerator ?? new FakeIdGenerator(),
	})
}
