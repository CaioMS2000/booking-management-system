import {
	Result,
	Email,
	failure,
	IdGenerator,
	Name,
	UseCase,
	Phone,
	success,
} from '@repo/core'
import { Admin } from '@/domain/models/admin'
import { InvalidEmailError, InvalidPhoneError } from '../@errors'
import { AdminRepository } from '../repositories/admin-repository'

export type CreateAdminUseCaseRequest = {
	name: string
	email: string
	phone: string
}

export type CreateAdminUseCaseResponse = Result<
	InvalidEmailError | InvalidPhoneError,
	{
		admin: Admin
	}
>

type UseCaseProps = {
	adminRepository: AdminRepository
	idGeneratorV7: IdGenerator
}

export class CreateAdminUseCase extends UseCase<
	CreateAdminUseCaseRequest,
	CreateAdminUseCaseResponse,
	UseCaseProps
> {
	constructor(protected props: UseCaseProps) {
		super()
	}

	async execute(
		input: CreateAdminUseCaseRequest
	): Promise<CreateAdminUseCaseResponse> {
		const name = Name(input.name)
		const createEmailResult = Email.create(input.email)

		if (createEmailResult.isFailure()) {
			return failure(InvalidEmailError)
		}

		const createPhoneResult = Phone.create(input.phone)

		if (createPhoneResult.isFailure()) {
			return failure(InvalidPhoneError)
		}

		const admin = await Admin.create({
			input: {
				name,
				email: createEmailResult.value,
				phone: createPhoneResult.value,
			},
			idGenerator: this.props.idGeneratorV7,
		})

		await this.props.adminRepository.save(admin)
		return success({ admin })
	}
}
