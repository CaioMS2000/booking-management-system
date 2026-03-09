import { UniqueId } from '@repo/core'
import { Admin } from '@/domain/models/admin'

export abstract class AdminRepository {
	abstract findById(id: UniqueId): Promise<Admin | null>
	abstract save(admin: Admin): Promise<void>
	abstract update(admin: Admin): Promise<void>
	abstract delete(admin: Admin): Promise<void>
}
