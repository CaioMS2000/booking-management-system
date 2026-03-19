import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { beforeEach, describe, expect, it } from 'vitest'
import { OAuthAccountRepository } from '../../repositories/oauth-account-repository'
import { RefreshTokenRepository } from '../../repositories/refresh-token-repository'
import { UserRepository } from '../../repositories/user-repository'
import { SocialLoginUseCase } from './social-login-use-case'

const fakeTokenService = {
	signAccessToken: async () => 'fake-access-token',
	generateRefreshToken: () => 'fake-refresh-token',
	hashRefreshToken: () => 'fake-refresh-token-hash',
	verifyAccessToken: async () => null,
}

describe('SocialLoginUseCase', () => {
	let userRepo: UserRepository
	let oauthAccountRepo: OAuthAccountRepository
	let refreshTokenRepo: RefreshTokenRepository
	let sut: SocialLoginUseCase

	const input = {
		provider: 'google',
		providerAccountId: 'google-123',
		email: 'user@example.com',
		name: 'Test User',
	}

	beforeEach(() => {
		userRepo = mock(UserRepository)
		oauthAccountRepo = mock(OAuthAccountRepository)
		refreshTokenRepo = mock(RefreshTokenRepository)

		when(
			refreshTokenRepo.save(anything(), anything(), anything())
		).thenResolve()
		when(oauthAccountRepo.save(anything())).thenResolve({ id: 'oauth-1' })

		sut = new SocialLoginUseCase({
			userRepository: instance(userRepo),
			oauthAccountRepository: instance(oauthAccountRepo),
			tokenService: fakeTokenService as any,
			refreshTokenRepository: instance(refreshTokenRepo),
		})
	})

	it('should login existing user when provider account is already linked', async () => {
		when(
			oauthAccountRepo.findByProviderAndAccountId('google', 'google-123')
		).thenResolve({
			id: 'oauth-1',
			userId: 'user-1',
			provider: 'google',
			providerAccountId: 'google-123',
		})

		when(userRepo.findById('user-1')).thenResolve({
			id: 'user-1',
			name: 'Test User',
			email: 'user@example.com',
			phone: null,
			role: 'GUEST',
			passwordHash: null,
		})

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.isNewUser).toBe(false)
			expect(result.value.user.id).toBe('user-1')
			expect(result.value.accessToken).toBe('fake-access-token')
		}

		verify(oauthAccountRepo.save(anything())).never()
		verify(userRepo.save(anything())).never()
	})

	it('should auto-link and login when user with same email exists', async () => {
		when(
			oauthAccountRepo.findByProviderAndAccountId('google', 'google-123')
		).thenResolve(null)

		when(userRepo.findByEmail('user@example.com')).thenResolve({
			id: 'user-1',
			name: 'Test User',
			email: 'user@example.com',
			phone: '5599999999999',
			role: 'HOST',
			passwordHash: 'some-hash',
		})

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.isNewUser).toBe(false)
			expect(result.value.user.role).toBe('HOST')
		}

		verify(oauthAccountRepo.save(anything())).once()
		verify(userRepo.save(anything())).never()
	})

	it('should create new user when no existing user is found', async () => {
		when(
			oauthAccountRepo.findByProviderAndAccountId('google', 'google-123')
		).thenResolve(null)

		when(userRepo.findByEmail('user@example.com')).thenResolve(null)

		when(userRepo.save(anything())).thenResolve({ id: 'new-user-1' })

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.isNewUser).toBe(true)
			expect(result.value.user.id).toBe('new-user-1')
			expect(result.value.user.role).toBe('GUEST')
		}

		verify(userRepo.save(anything())).once()
		verify(oauthAccountRepo.save(anything())).once()
	})
})
