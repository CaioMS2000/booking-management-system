import { UniqueId } from '@repo/core'
import { Guest } from '@/domain/models/guest'

export abstract class GuestRepository {
	abstract findById(id: UniqueId): Promise<Guest | null>
	abstract save(guest: Guest): Promise<void>
	abstract update(guest: Guest): Promise<void>
	abstract delete(guest: Guest): Promise<void>
}
