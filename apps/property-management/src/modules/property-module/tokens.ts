import { HostRepository } from './application/repositories/host-repository'
import { ListingRepository } from './application/repositories/listing-repository'
import { PropertyRepository } from './application/repositories/property-repository'

export const PROPERTY_MODULE_TOKENS = {
	HostRepository: Symbol('HostRepository') as InjectionToken<HostRepository>,
	PropertyRepository: Symbol(
		'PropertyRepository'
	) as InjectionToken<PropertyRepository>,
	ListingRepository: Symbol(
		'ListingRepository'
	) as InjectionToken<ListingRepository>,
} as const
