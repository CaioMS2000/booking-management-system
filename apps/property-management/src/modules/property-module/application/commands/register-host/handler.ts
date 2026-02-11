import { Email, failure, Phone, success } from '@repo/core'
import { appContext } from '@/application-context'
import { CommandHandler } from '@/modules/property-module/application/command'
import { HostRepository } from '@/modules/property-module/application/repositories/host-repository'
import { Host } from '@/modules/property-module/domain/entities/host'
import { RegisterHostCommand } from './command'

export class RegisterHostCommandHandler extends CommandHandler<RegisterHostCommand> {
	constructor(private hostRepository: HostRepository) {
		super()
	}

	async execute(command: RegisterHostCommand) {
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

		const host = Host.create({
			id,
			name: command.name,
			email: emailResult.value,
			phone: phoneResult.value,
		})

		await this.hostRepository.save(host)

		return success(host)
	}
}
