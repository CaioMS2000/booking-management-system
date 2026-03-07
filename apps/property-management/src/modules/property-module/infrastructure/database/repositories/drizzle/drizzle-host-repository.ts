import { eq } from 'drizzle-orm'
import type { UniqueId } from '@repo/core'
import { database } from '@/lib/drizzle'
import { HostRepository } from '@/modules/property-module/application/repositories/host-repository'
import { HostNotFoundError } from '@/modules/property-module/application/@errors/host-not-found-error'
import type { Host } from '@/modules/property-module/domain/models/host'
import { hosts } from '../../schemas/drizzle/hosts'
import { properties } from '../../schemas/drizzle/properties'
import { HostMapper } from '../../mappers/host-mapper'

export class DrizzleHostRepository extends HostRepository {
	async save(host: Host): Promise<void> {
		await database.insert(hosts).values(HostMapper.toPersistence(host))
	}

	async update(host: Host): Promise<void> {
		const data = HostMapper.toPersistence(host)
		await database.update(hosts).set(data).where(eq(hosts.id, host.id))
	}

	async findById(id: UniqueId): Promise<Host | null> {
		const [row] = await database
			.select()
			.from(hosts)
			.where(eq(hosts.id, id))
			.limit(1)

		if (!row) return null

		const propertyRows = await database
			.select({ id: properties.id })
			.from(properties)
			.where(eq(properties.hostId, id))

		return HostMapper.toDomain(
			row,
			propertyRows.map(p => p.id)
		)
	}

	async getById(id: UniqueId): Promise<Host> {
		const host = await this.findById(id)
		if (!host) throw new HostNotFoundError(`Host not found: ${id}`)
		return host
	}
}
