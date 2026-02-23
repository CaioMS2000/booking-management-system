import { ListingDTO, PropertyDTO } from './dto'

export abstract class PropertyModuleInterface {
	abstract findProperty(propertyId: string): Promise<PropertyDTO | null>
	abstract propertyExists(propertyId: string): Promise<boolean>
	abstract findListing(listingId: string): Promise<ListingDTO | null>
}
