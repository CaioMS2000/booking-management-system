import { Result, success, UseCase } from '@repo/core'
import type { TokenService } from '@/infrastructure/auth/token-service'
import type { RefreshTokenRepository } from '../../repositories/refresh-token-repository'

export type LogoutUseCaseRequest = {
	refreshToken: string
}

export type LogoutUseCaseResponse = Result<never, undefined>

type UseCaseProps = {
	tokenService: TokenService
	refreshTokenRepository: RefreshTokenRepository
}

export class LogoutUseCase extends UseCase<
	LogoutUseCaseRequest,
	LogoutUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(input: LogoutUseCaseRequest): Promise<LogoutUseCaseResponse> {
		const tokenHash = this.props.tokenService.hashRefreshToken(
			input.refreshToken
		)
		await this.props.refreshTokenRepository.revoke(tokenHash)
		return success(undefined)
	}
}
