import { failure, success } from '@repo/core'
import { appContext } from '@/application-context'
import { HostNotFoundError } from '@/modules/property-module/application/@errors'
import { CommandHandler } from '@/modules/property-module/application/command'
import { HostRepository } from '@/modules/property-module/application/repositories/host-repository'
import { PropertyRepository } from '@/modules/property-module/application/repositories/property-repository'
import { Property } from '@/modules/property-module/domain/entities/property'
import { Address } from '@/modules/property-module/domain/value-object'
import { RegisterPropertyCommand } from './command'

export class RegisterPropertyCommandHandler extends CommandHandler<RegisterPropertyCommand> {
	constructor(
		private hostRepository: HostRepository,
		private propertyRepository: PropertyRepository
	) {
		super()
	}

	async execute(command: RegisterPropertyCommand) {
		const host = await this.hostRepository.findById(command.params.hostId)

		if (!host) {
			return failure(new HostNotFoundError())
		}

		const context = appContext.get()
		const id = await context.idGenerator.V4.generate()
		const incrementalId = await context.idGenerator.Incremental.generate()
		const address = Address.create(command.params.address)

		const newProperty = Property.create({
			id,
			hostId: command.params.hostId,
			name: command.params.name,
			description: command.params.description,
			capacity: command.params.capacity,
			propertyType: command.params.propertyType,
			publicId: incrementalId,
			address,
			imagesUrls: command.params.imagesUrls,
		})

		await this.propertyRepository.save(newProperty)

		return success(newProperty)
	}
}
