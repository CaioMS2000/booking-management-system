import { failure, Result, success, UseCase } from '@repo/core'
import type { PasswordService } from '@/infrastructure/auth/password-service'
import { PasswordAlreadySetError } from '../@errors'
import type { UserRepository } from '../repositories/user-repository'

export type SetPasswordUseCaseRequest = {
	userId: string
	password: string
}

export type SetPasswordUseCaseResponse = Result<
	PasswordAlreadySetError,
	{ success: true }
>

type UseCaseProps = {
	userRepository: UserRepository
	passwordService: PasswordService
}

export class SetPasswordUseCase extends UseCase<
	SetPasswordUseCaseRequest,
	SetPasswordUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: SetPasswordUseCaseRequest
	): Promise<SetPasswordUseCaseResponse> {
		const user = await this.props.userRepository.findById(input.userId)

		if (!user || user.passwordHash !== null) {
			return failure(PasswordAlreadySetError)
		}

		const passwordHash = await this.props.passwordService.hash(input.password)
		await this.props.userRepository.updatePasswordHash(
			input.userId,
			passwordHash
		)

		return success({ success: true })
	}
}
