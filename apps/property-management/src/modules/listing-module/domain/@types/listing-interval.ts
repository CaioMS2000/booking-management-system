import { ListingStatus } from './listing-status'

export type AvailabilityInterval = {
	from: Date
	to: Date
	type: ListingStatus
}
