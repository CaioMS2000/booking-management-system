import { failure, Result, success, UseCase } from '@repo/core'
import type { TokenService } from '@/infrastructure/auth/token-service'
import {
	InvalidRefreshTokenError,
	TokenReplayDetectedError,
} from '../../@errors'
import type { RefreshTokenRepository } from '../../repositories/refresh-token-repository'
import type { UserRepository } from '../../repositories/user-repository'

export type RefreshTokenUseCaseRequest = {
	refreshToken: string
}

export type RefreshTokenUseCaseResponse = Result<
	InvalidRefreshTokenError | TokenReplayDetectedError,
	{
		accessToken: string
		refreshToken: string
	}
>

const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60 // 30 days

type UseCaseProps = {
	userRepository: UserRepository
	tokenService: TokenService
	refreshTokenRepository: RefreshTokenRepository
}

export class RefreshTokenUseCase extends UseCase<
	RefreshTokenUseCaseRequest,
	RefreshTokenUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: RefreshTokenUseCaseRequest
	): Promise<RefreshTokenUseCaseResponse> {
		const tokenHash = this.props.tokenService.hashRefreshToken(
			input.refreshToken
		)

		const stored =
			await this.props.refreshTokenRepository.findByTokenHash(tokenHash)

		if (!stored) {
			return failure(InvalidRefreshTokenError)
		}

		// Replay detection: token already used → revoke all tokens for this user
		if (stored.used) {
			await this.props.refreshTokenRepository.revokeAllForUser(stored.userId)
			return failure(TokenReplayDetectedError)
		}

		// Mark current token as used (for replay detection)
		await this.props.refreshTokenRepository.markUsed(tokenHash)

		const user = await this.props.userRepository.findById(stored.userId)

		if (!user) {
			await this.props.refreshTokenRepository.revoke(tokenHash)
			return failure(InvalidRefreshTokenError)
		}

		// Generate new token pair
		const accessToken = await this.props.tokenService.signAccessToken({
			sub: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
		})

		const newRefreshToken = this.props.tokenService.generateRefreshToken()
		const newRefreshTokenHash =
			this.props.tokenService.hashRefreshToken(newRefreshToken)

		await this.props.refreshTokenRepository.save(
			user.id,
			newRefreshTokenHash,
			REFRESH_TOKEN_EXPIRY_SECONDS
		)

		// Revoke old token
		await this.props.refreshTokenRepository.revoke(tokenHash)

		return success({
			accessToken,
			refreshToken: newRefreshToken,
		})
	}
}
