import {
	Result,
	failure,
	UseCase,
	UniqueId,
	success,
	Email,
	Phone,
} from '@repo/core'
import { Admin } from '@/domain/models/admin'
import {
	AdminNotFoundError,
	InvalidEmailError,
	InvalidPhoneError,
} from '../@errors'
import { AdminRepository } from '../repositories/admin-repository'

export type UpdateAdminUseCaseRequest = {
	adminId: string
	name?: string
	email?: string
	phone?: string
}

export type UpdateAdminUseCaseResponse = Result<
	AdminNotFoundError | InvalidEmailError | InvalidPhoneError,
	{
		admin: Admin
	}
>

type UseCaseProps = {
	adminRepository: AdminRepository
}

export class UpdateAdminUseCase extends UseCase<
	UpdateAdminUseCaseRequest,
	UpdateAdminUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: UpdateAdminUseCaseRequest
	): Promise<UpdateAdminUseCaseResponse> {
		const admin = await this.props.adminRepository.findById(
			UniqueId(input.adminId)
		)

		if (!admin) {
			return failure(AdminNotFoundError)
		}

		const updateFields: { name?: string; email?: Email; phone?: Phone } = {}

		if (input.name !== undefined) {
			updateFields.name = input.name
		}

		if (input.email !== undefined) {
			const emailResult = Email.create(input.email)
			if (emailResult.isFailure()) {
				return failure(InvalidEmailError)
			}
			updateFields.email = emailResult.value
		}

		if (input.phone !== undefined) {
			const phoneResult = Phone.create(input.phone)
			if (phoneResult.isFailure()) {
				return failure(InvalidPhoneError)
			}
			updateFields.phone = phoneResult.value
		}

		const updatedAdmin = admin.update(updateFields)

		await this.props.adminRepository.update(updatedAdmin)

		return success({ admin: updatedAdmin })
	}
}
