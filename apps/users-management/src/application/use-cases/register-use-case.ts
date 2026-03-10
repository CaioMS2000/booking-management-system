import { failure, Result, success, UseCase } from '@repo/core'
import type { PasswordService } from '@/infrastructure/auth/password-service'
import type { TokenService } from '@/infrastructure/auth/token-service'
import { EmailAlreadyRegisteredError } from '../@errors'
import type { RefreshTokenRepository } from '../repositories/refresh-token-repository'
import type { UserRepository } from '../repositories/user-repository'

export type RegisterUseCaseRequest = {
	name: string
	email: string
	password: string
	phone: string
	role: 'HOST' | 'GUEST' | 'ADMIN'
}

export type RegisterUseCaseResponse = Result<
	EmailAlreadyRegisteredError,
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

export class RegisterUseCase extends UseCase<
	RegisterUseCaseRequest,
	RegisterUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: RegisterUseCaseRequest
	): Promise<RegisterUseCaseResponse> {
		const emailExists = await this.props.userRepository.existsByEmail(
			input.email
		)

		if (emailExists) {
			return failure(EmailAlreadyRegisteredError)
		}

		const passwordHash = await this.props.passwordService.hash(input.password)

		const { id } = await this.props.userRepository.save({
			name: input.name,
			email: input.email,
			phone: input.phone,
			role: input.role,
			passwordHash,
		})

		const accessToken = await this.props.tokenService.signAccessToken({
			sub: id,
			name: input.name,
			email: input.email,
			role: input.role,
		})

		const refreshToken = this.props.tokenService.generateRefreshToken()
		const refreshTokenHash =
			this.props.tokenService.hashRefreshToken(refreshToken)

		await this.props.refreshTokenRepository.save(
			id,
			refreshTokenHash,
			REFRESH_TOKEN_EXPIRY_SECONDS
		)

		return success({
			accessToken,
			refreshToken,
			user: { id, name: input.name, email: input.email, role: input.role },
		})
	}
}
