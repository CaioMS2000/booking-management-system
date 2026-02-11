import { UniqueEntityID } from '@repo/core'
import { Host } from '@/modules/property-module/domain/entities/host'

export abstract class HostRepository {
	abstract findById(id: UniqueEntityID): Promise<Host | null>
	abstract getById(id: UniqueEntityID): Promise<Host>
	abstract save(host: Host): Promise<void>
}
