import { Email, Name, UniqueId } from '@repo/core'
import { Guest } from '@/modules/booking-module/domain/models/guest'
import { Pagination } from '@/modules/property-module/application/repositories/params'

export type GuestFilters = {
	name?: Name
	email?: Email
}

export abstract class GuestRepository {
	abstract save(guest: Guest): Promise<void>
	abstract findById(id: UniqueId): Promise<Guest | null>
	abstract findMany(
		filters?: GuestFilters,
		pagination?: Pagination
	): Promise<Guest[]>
	abstract update(guest: Guest): Promise<void>
	abstract delete(guest: Guest): Promise<void>
}
