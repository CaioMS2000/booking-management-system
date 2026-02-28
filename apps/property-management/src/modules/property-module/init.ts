import { asFunction } from 'awilix'
import { container } from '@/container'
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
	// Property use cases
	createPropertyUseCase: asFunction(
		({ hostRepository, propertyRepository }) =>
			new CreatePropertyUseCase({ hostRepository, propertyRepository })
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
		({ hostRepository, propertyRepository, listingRepository }) =>
			new CreateListingUseCase({
				hostRepository,
				propertyRepository,
				listingRepository,
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
