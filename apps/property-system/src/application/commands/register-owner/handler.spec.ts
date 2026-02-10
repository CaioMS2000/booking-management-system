import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { beforeEach, describe, expect, it } from 'vitest'
import { InvalidValueError } from '@repo/core'
import { OwnerRepository } from '@/application/repositories/owner-repository'
import { appContext } from '@/application-context'
import { makeAppContext } from '@/test/factories/make-app-context'
import { Owner } from '@/domain/entities/owner'
import { RegisterOwnerCommandHandler } from './handler'
import { RegisterOwnerCommand } from './command'

describe('RegisterOwnerCommandHandler', () => {
	let ownerRepo: OwnerRepository
	let sut: RegisterOwnerCommandHandler

	beforeEach(() => {
		ownerRepo = mock(OwnerRepository)
		sut = new RegisterOwnerCommandHandler(instance(ownerRepo))
	})

	it('should return failure when email is invalid', () => {
		return appContext.run(makeAppContext(), async () => {
			const command = await RegisterOwnerCommand.create({
				name: 'John Doe',
				email: 'invalid-email',
				phone: '5511999999999',
			})

			const result = await sut.execute(command)

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidValueError)
		})
	})

	it('should return failure when phone is invalid', () => {
		return appContext.run(makeAppContext(), async () => {
			const command = await RegisterOwnerCommand.create({
				name: 'John Doe',
				email: 'john@example.com',
				phone: '',
			})

			const result = await sut.execute(command)

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidValueError)
		})
	})

	it('should create and save owner successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			when(ownerRepo.save(anything())).thenResolve()

			const command = await RegisterOwnerCommand.create({
				name: 'John Doe',
				email: 'john@example.com',
				phone: '5511999999999',
			})

			const result = await sut.execute(command)

			expect(result.isSuccess()).toBe(true)

			const owner = result.value as Owner
			expect(owner.name).toBe('John Doe')

			verify(ownerRepo.save(anything())).once()
		})
	})
})
