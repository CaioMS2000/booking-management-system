import { failure, Result, success, UseCase } from '@repo/core'
import type { PasswordService } from '@/infrastructure/auth/password-service'
import type { TokenService } from '@/infrastructure/auth/token-service'
import { InvalidCredentialsError } from '../@errors'
import type { RefreshTokenRepository } from '../repositories/refresh-token-repository'
import type { UserRepository } from '../repositories/user-repository'

export type LoginUseCaseRequest = {
	email: string
	password: string
}

export type LoginUseCaseResponse = Result<
	InvalidCredentialsError,
	{
		accessToken: string
		refreshToken: string
		user: { id: string; name: string; email: string; role: string }
	}
>

const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60 // 30 days

type UseCaseProps = {
	userRepository: UserRepository
	passwordService: PasswordService
	tokenService: TokenService
	refreshTokenRepository: RefreshTokenRepository
}

export class LoginUseCase extends UseCase<
	LoginUseCaseRequest,
	LoginUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(input: LoginUseCaseRequest): Promise<LoginUseCaseResponse> {
		const user = await this.props.userRepository.findByEmail(input.email)

		if (!user || !user.passwordHash) {
			return failure(InvalidCredentialsError)
		}

		const passwordValid = await this.props.passwordService.verify(
			user.passwordHash,
			input.password
		)

		if (!passwordValid) {
			return failure(InvalidCredentialsError)
		}

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
		})
	}
}
