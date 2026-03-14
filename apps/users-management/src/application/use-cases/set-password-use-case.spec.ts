import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { beforeEach, describe, expect, it } from 'vitest'
import { PasswordAlreadySetError } from '../@errors'
import { UserRepository } from '../repositories/user-repository'
import { SetPasswordUseCase } from './set-password-use-case'

const fakePasswordService = {
	hash: async (password: string) => `hashed-${password}`,
	verify: async () => true,
}

describe('SetPasswordUseCase', () => {
	let userRepo: UserRepository
	let sut: SetPasswordUseCase

	const input = {
		userId: 'user-1',
		password: 'my-new-password',
	}

	beforeEach(() => {
		userRepo = mock(UserRepository)

		sut = new SetPasswordUseCase({
			userRepository: instance(userRepo),
			passwordService: fakePasswordService as any,
		})
	})

	it('should set password when user has no password', async () => {
		when(userRepo.findById('user-1')).thenResolve({
			id: 'user-1',
			name: 'Test User',
			email: 'user@example.com',
			phone: null,
			role: 'GUEST',
			passwordHash: null,
		})

		when(userRepo.updatePasswordHash(anything(), anything())).thenResolve()

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.success).toBe(true)
		}

		verify(
			userRepo.updatePasswordHash('user-1', 'hashed-my-new-password')
		).once()
	})

	it('should fail when user already has a password', async () => {
		when(userRepo.findById('user-1')).thenResolve({
			id: 'user-1',
			name: 'Test User',
			email: 'user@example.com',
			phone: null,
			role: 'GUEST',
			passwordHash: 'existing-hash',
		})

		const result = await sut.execute(input)

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(PasswordAlreadySetError)
		}

		verify(userRepo.updatePasswordHash(anything(), anything())).never()
	})

	it('should fail when user is not found', async () => {
		when(userRepo.findById('user-1')).thenResolve(null)

		const result = await sut.execute(input)

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(PasswordAlreadySetError)
		}

		verify(userRepo.updatePasswordHash(anything(), anything())).never()
	})
})
