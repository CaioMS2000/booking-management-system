import { failure, success } from '@repo/core'
import { OwnerNotFoundError } from '@/application/@errors'
import { CommandHandler } from '@/application/command'
import { OwnerRepository } from '@/application/repositories/owner-repository'
import { PropertyRepository } from '@/application/repositories/property-repository'
import { appContext } from '@/application-context'
import { Property } from '@/domain/entities/property'
import { Address, Money } from '@/domain/value-object'
import { RegisterPropertyCommand } from './command'

export class RegisterPropertyCommandHandler extends CommandHandler<RegisterPropertyCommand> {
	constructor(
		private ownerRepository: OwnerRepository,
		private propertyRepository: PropertyRepository
	) {
		super()
	}

	async execute(command: RegisterPropertyCommand) {
		const owner = await this.ownerRepository.findById(command.params.ownerId)

		if (!owner) {
			return failure(new OwnerNotFoundError())
		}

		const context = appContext.get()
		const id = await context.idGenerator.V4.generate()

		const address = Address.create(command.params.address)
		const pricePerNight = command.params.pricePerNight
			? Money.create(command.params.pricePerNight)
			: undefined

		const newProperty = Property.create({
			id,
			ownerId: command.params.ownerId,
			name: command.params.name,
			description: command.params.description,
			capacity: command.params.capacity,
			pricePerNight,
			propertyType: command.params.propertyType,
			publicId: command.params.publicId,
			address,
			status: command.params.status,
			imagesUrls: command.params.imagesUrls,
		})

		await this.propertyRepository.save(newProperty)

		return success(newProperty)
	}
}
