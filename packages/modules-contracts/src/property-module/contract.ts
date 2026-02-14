import { PropertyDTO } from './dto'

export abstract class PropertyModuleInterface {
	abstract findProperty(propertyId: string): Promise<PropertyDTO | null>
	abstract propertyExists(propertyId: string): Promise<boolean>
}
