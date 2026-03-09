import { asFunction } from 'awilix'
import { container } from '@/container'
import { DrizzleHostRepository } from './infrastructure/database/repositories/drizzle/drizzle-host-repository'
import { DrizzleListingRepository } from './infrastructure/database/repositories/drizzle/drizzle-listing-repository'
import { DrizzlePropertyRepository } from './infrastructure/database/repositories/drizzle/drizzle-property-repository'
import { CreateHostUseCase } from './application/use-cases/create-host-use-case'
import { CreateListingUseCase } from './application/use-cases/create-listing-use-case'
import { CreatePropertyUseCase } from './application/use-cases/create-property-use-case'
import { DeleteListingUseCase } from './application/use-cases/delete-listing-use-case'
import { DeletePropertyUseCase } from './application/use-cases/delete-property-use-case'
import { GetAllListingsUseCase } from './application/use-cases/get-all-listings-use-case'
import { GetAllPropertiesUseCase } from './application/use-cases/get-all-properties-use-case'
import { GetListingUseCase } from './application/use-cases/get-listing-use-case'
import { GetPropertyUseCase } from './application/use-cases/get-property-use-case'
import { UpdateListingUseCase } from './application/use-cases/update-listing-use-case'
import { UpdatePropertyUseCase } from './application/use-cases/update-property-use-case'
import { ListingController } from './infrastructure/http/controllers/listing-controller'
import { PropertyController } from './infrastructure/http/controllers/property-controller'

container.register({
	// Repositories
	hostRepository: asFunction(() => new DrizzleHostRepository()).singleton(),
	propertyRepository: asFunction(
		() => new DrizzlePropertyRepository()
	).singleton(),
	listingRepository: asFunction(
		({ idGeneratorV4 }) => new DrizzleListingRepository(idGeneratorV4)
	).singleton(),

	// Host use cases
	createHostUseCase: asFunction(
		({ idGeneratorV7 }) => new CreateHostUseCase({ idGeneratorV7 })
	).singleton(),

	// Property use cases
	createPropertyUseCase: asFunction(
		({
			hostRepository,
			propertyRepository,
			idGeneratorV7,
			incrementalIdGenerator,
		}) =>
			new CreatePropertyUseCase({
				hostRepository,
				propertyRepository,
				idGeneratorV7,
				incrementalIdGenerator,
			})
	).singleton(),

	getPropertyUseCase: asFunction(
		({ hostRepository, propertyRepository }) =>
			new GetPropertyUseCase({ hostRepository, propertyRepository })
	).singleton(),

	getAllPropertiesUseCase: asFunction(
		({ hostRepository, propertyRepository }) =>
			new GetAllPropertiesUseCase({ hostRepository, propertyRepository })
	).singleton(),

	updatePropertyUseCase: asFunction(
		({ hostRepository, propertyRepository }) =>
			new UpdatePropertyUseCase({ hostRepository, propertyRepository })
	).singleton(),

	deletePropertyUseCase: asFunction(
		({ hostRepository, propertyRepository, listingRepository }) =>
			new DeletePropertyUseCase({
				hostRepository,
				propertyRepository,
				listingRepository,
			})
	).singleton(),

	// Listing use cases
	createListingUseCase: asFunction(
		({
			hostRepository,
			propertyRepository,
			listingRepository,
			idGeneratorV7,
			incrementalIdGenerator,
		}) =>
			new CreateListingUseCase({
				hostRepository,
				propertyRepository,
				listingRepository,
				idGeneratorV7,
				incrementalIdGenerator,
			})
	).singleton(),

	getListingUseCase: asFunction(
		({ listingRepository }) => new GetListingUseCase({ listingRepository })
	).singleton(),

	getAllListingsUseCase: asFunction(
		({ listingRepository }) => new GetAllListingsUseCase({ listingRepository })
	).singleton(),

	updateListingUseCase: asFunction(
		({ hostRepository, propertyRepository, listingRepository }) =>
			new UpdateListingUseCase({
				hostRepository,
				propertyRepository,
				listingRepository,
			})
	).singleton(),

	deleteListingUseCase: asFunction(
		({ hostRepository, propertyRepository, listingRepository }) =>
			new DeleteListingUseCase({
				hostRepository,
				propertyRepository,
				listingRepository,
			})
	).singleton(),

	// Controllers
	propertyController: asFunction(
		({
			app,
			createPropertyUseCase,
			getPropertyUseCase,
			getAllPropertiesUseCase,
			updatePropertyUseCase,
			deletePropertyUseCase,
		}) =>
			new PropertyController({
				app,
				createPropertyUseCase,
				getPropertyUseCase,
				getAllPropertiesUseCase,
				updatePropertyUseCase,
				deletePropertyUseCase,
			})
	).singleton(),

	listingController: asFunction(
		({
			app,
			createListingUseCase,
			getListingUseCase,
			getAllListingsUseCase,
			updateListingUseCase,
			deleteListingUseCase,
		}) =>
			new ListingController({
				app,
				createListingUseCase,
				getListingUseCase,
				getAllListingsUseCase,
				updateListingUseCase,
				deleteListingUseCase,
			})
	).singleton(),
})
