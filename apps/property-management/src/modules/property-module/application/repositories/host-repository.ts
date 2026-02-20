import { UniqueId } from '@repo/core'
import { Host } from '@/modules/property-module/domain/models/host'

export abstract class HostRepository {
	abstract findById(id: UniqueId): Promise<Host | null>
	abstract getById(id: UniqueId): Promise<Host>
	abstract save(host: Host): Promise<void>
}
