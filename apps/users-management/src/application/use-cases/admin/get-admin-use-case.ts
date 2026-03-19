import { failure, Result, success, UniqueId, UseCase } from '@repo/core'
import { Admin } from '@/domain/models/admin'
import { AdminNotFoundError } from '../../@errors'
import { AdminRepository } from '../../repositories/admin-repository'

export type GetAdminUseCaseRequest = {
	adminId: string
}

export type GetAdminUseCaseResponse = Result<
	AdminNotFoundError,
	{
		admin: Admin
	}
>

type UseCaseProps = {
	adminRepository: AdminRepository
}

export class GetAdminUseCase extends UseCase<
	GetAdminUseCaseRequest,
	GetAdminUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: GetAdminUseCaseRequest
	): Promise<GetAdminUseCaseResponse> {
		const admin = await this.props.adminRepository.findById(
			UniqueId(input.adminId)
		)

		if (!admin) {
			return failure(AdminNotFoundError)
		}

		return success({ admin })
	}
}
