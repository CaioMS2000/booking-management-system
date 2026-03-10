import { failure, Result, success, UniqueId, UseCase } from '@repo/core'
import { Admin } from '@/domain/models/admin'
import { AdminNotFoundError } from '../@errors'
import { AdminRepository } from '../repositories/admin-repository'

export type DeleteAdminUseCaseRequest = {
	adminId: string
}

export type DeleteAdminUseCaseResponse = Result<AdminNotFoundError, Admin>

type UseCaseProps = {
	adminRepository: AdminRepository
}

export class DeleteAdminUseCase extends UseCase<
	DeleteAdminUseCaseRequest,
	DeleteAdminUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: DeleteAdminUseCaseRequest
	): Promise<DeleteAdminUseCaseResponse> {
		const admin = await this.props.adminRepository.findById(
			UniqueId(input.adminId)
		)

		if (!admin) {
			return failure(AdminNotFoundError)
		}

		const deletedAdmin = admin.delete()
		await this.props.adminRepository.delete(deletedAdmin)
		return success(deletedAdmin)
	}
}
