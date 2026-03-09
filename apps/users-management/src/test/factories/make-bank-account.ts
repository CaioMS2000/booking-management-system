import { IdGenerator, UniqueId } from '@repo/core'
import { BankAccount } from '@/domain/value-object'
import { FakeIdGenerator } from '../fake-id-generator'

type MakeBankAccountParams = {
	userId?: UniqueId
	idGenerator?: IdGenerator
}

export async function makeBankAccount({
	userId = UniqueId('fake-user-id'),
	idGenerator,
}: MakeBankAccountParams = {}): Promise<BankAccount> {
	return BankAccount.create({
		value: {
			userId,
			name: 'Banco do Brasil',
			code: '001',
			agency: '1234',
			agencyId: '5',
			accountNumber: '12345678',
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		idGenerator: idGenerator ?? new FakeIdGenerator(),
	})
}
