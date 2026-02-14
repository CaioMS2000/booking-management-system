import { failure, success, UniqueEntityID } from '@repo/core'
import { appContext } from '@/application-context'
import { CommandHandler } from '@/modules/listing-module/application/command'
import { Listing } from '@/modules/listing-module/domain/entities/listing'
import { RegisterListingCommand } from './command'
import { PropertyModuleInterface } from '@repo/modules-contracts'
import { PropertyNotFoundError } from '../../@errors'
import { ListingRepository } from '../../repositories'

export class RegisterListingCommandHandler extends CommandHandler<RegisterListingCommand> {
	constructor(
		private propertyModule: PropertyModuleInterface,
		private listingRepository: ListingRepository
	) {
		super()
	}

	async execute(command: RegisterListingCommand) {
		const property = await this.propertyModule.findProperty(
			command.params.propertyId.toString()
		)

		if (!property) {
			// return failure(new PropertyNotFoundError())
			// OR
			return failure(PropertyNotFoundError)
		}

		const context = appContext.get()
		const id = await context.idGenerator.V4.generate()
		const incrementalId = await context.idGenerator.Incremental.generate()

		const newListing = Listing.create({
			id,
			propertyId: new UniqueEntityID(property.id),
			publicId: incrementalId,
			pricePerNight: command.params.pricePerNight,
		})

		await this.listingRepository.save(newListing)

		return success(newListing)
	}
}
