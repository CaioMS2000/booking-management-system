import { UniqueId } from '@repo/core'
import { Host } from '@/domain/models/host'

export abstract class HostRepository {
	abstract findById(id: UniqueId): Promise<Host | null>
	abstract save(host: Host): Promise<void>
	abstract update(host: Host): Promise<void>
	abstract delete(host: Host): Promise<void>
}
