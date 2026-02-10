import { Email, Phone, failure, success } from '@repo/core'
import { appContext } from '@/application-context'
import { CommandHandler } from '@/application/command'
import { OwnerRepository } from '@/application/repositories/owner-repository'
import { Owner } from '@/domain/entities/owner'
import { RegisterOwnerCommand } from './command'

export class RegisterOwnerCommandHandler extends CommandHandler<RegisterOwnerCommand> {
	constructor(private ownerRepository: OwnerRepository) {
		super()
	}

	async execute(command: RegisterOwnerCommand) {
		const emailResult = Email.create(command.email)

		if (emailResult.isFailure()) {
			return failure(emailResult.value)
		}

		const phoneResult = Phone.create(command.phone)

		if (phoneResult.isFailure()) {
			return failure(phoneResult.value)
		}

		const context = appContext.get()
		const id = await context.idGenerator.V4.generate()

		const owner = Owner.create({
			id,
			name: command.name,
			email: emailResult.value,
			phone: phoneResult.value,
		})

		await this.ownerRepository.save(owner)

		return success(owner)
	}
}
