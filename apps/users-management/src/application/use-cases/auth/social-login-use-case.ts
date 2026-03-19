import { failure, Result, success, UseCase } from '@repo/core'
import type { TokenService } from '@/infrastructure/auth/token-service'
import type { OAuthAccountRepository } from '../../repositories/oauth-account-repository'
import type { RefreshTokenRepository } from '../../repositories/refresh-token-repository'
import type { UserRepository } from '../../repositories/user-repository'

export type SocialLoginUseCaseRequest = {
	provider: string
	providerAccountId: string
	email: string
	name: string
}

export type SocialLoginUseCaseResponse = Result<
	never,
	{
		accessToken: string
		refreshToken: string
		user: { id: string; name: string; email: string; role: string }
		isNewUser: boolean
	}
>

const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60 // 30 days

type UseCaseProps = {
	userRepository: UserRepository
	oauthAccountRepository: OAuthAccountRepository
	tokenService: TokenService
	refreshTokenRepository: RefreshTokenRepository
}

export class SocialLoginUseCase extends UseCase<
	SocialLoginUseCaseRequest,
	SocialLoginUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: SocialLoginUseCaseRequest
	): Promise<SocialLoginUseCaseResponse> {
		// 1. Check if this provider account is already linked
		const existingLink =
			await this.props.oauthAccountRepository.findByProviderAndAccountId(
				input.provider,
				input.providerAccountId
			)

		if (existingLink) {
			const user = await this.props.userRepository.findById(existingLink.userId)

			if (user) {
				return this.issueTokens(user, false)
			}
		}

		// 2. Check if a user with this email already exists (auto-link)
		const existingUser = await this.props.userRepository.findByEmail(
			input.email
		)

		if (existingUser) {
			await this.props.oauthAccountRepository.save({
				userId: existingUser.id,
				provider: input.provider,
				providerAccountId: input.providerAccountId,
			})

			return this.issueTokens(existingUser, false)
		}

		// 3. Create new user (no password, no phone)
		const { id } = await this.props.userRepository.save({
			name: input.name,
			email: input.email,
			phone: null,
			role: 'GUEST',
			passwordHash: null,
		})

		await this.props.oauthAccountRepository.save({
			userId: id,
			provider: input.provider,
			providerAccountId: input.providerAccountId,
		})

		return this.issueTokens(
			{ id, name: input.name, email: input.email, role: 'GUEST' },
			true
		)
	}

	private async issueTokens(
		user: { id: string; name: string; email: string; role: string },
		isNewUser: boolean
	): Promise<SocialLoginUseCaseResponse> {
		const accessToken = await this.props.tokenService.signAccessToken({
			sub: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
		})

		const refreshToken = this.props.tokenService.generateRefreshToken()
		const refreshTokenHash =
			this.props.tokenService.hashRefreshToken(refreshToken)

		await this.props.refreshTokenRepository.save(
			user.id,
			refreshTokenHash,
			REFRESH_TOKEN_EXPIRY_SECONDS
		)

		return success({
			accessToken,
			refreshToken,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
			isNewUser,
		})
	}
}
