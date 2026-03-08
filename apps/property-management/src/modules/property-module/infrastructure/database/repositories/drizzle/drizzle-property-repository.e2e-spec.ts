import {
	UniqueId,
	UUIDV4Generator,
	UUIDV7Generator,
	DefaultIncrementalIdGenerator,
} from '@repo/core'
import { describe, it, expect, afterAll, afterEach } from 'vitest'
import { appContext } from '@/context/application-context'
import { PropertyNotFoundError } from '@/modules/property-module/application/@errors/property-not-found-error'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import {
	cleanDatabase,
	closeDatabase,
} from '@/modules/property-module/test/setup-database'
import { DrizzleHostRepository } from './drizzle-host-repository'
import { DrizzlePropertyRepository } from './drizzle-property-repository'

const ctx = makeAppContext({
	idGenerator: {
		V4: new UUIDV4Generator(),
		V7: new UUIDV7Generator(),
		Incremental: new DefaultIncrementalIdGenerator(),
	},
})
const hostRepository = new DrizzleHostRepository()
const repository = new DrizzlePropertyRepository()

async function createHost() {
	const host = await makeHost()
	await hostRepository.save(host)
	return host
}

describe('DrizzlePropertyRepository', () => {
	afterEach(async () => {
		await cleanDatabase()
	})

	afterAll(async () => {
		await closeDatabase()
	})

	it('should save and find a property by id', async () => {
		await appContext.run(ctx, async () => {
			const host = await createHost()
			const property = await makeProperty(host.id)

			await repository.save(property)
			const found = await repository.findById(property.id)

			expect(found).not.toBeNull()
			expect(found!.id).toBe(property.id)
			expect(found!.name).toBe(property.name)
			expect(found!.description).toBe(property.description)
			expect(found!.capacity).toBe(property.capacity)
			expect(found!.type).toBe(property.type)
			expect(found!.address).toEqual(property.address)
			expect(found!.imagesUrls).toEqual(property.imagesUrls)
			expect(found!.publicId).toBe(property.publicId)
		})
	})

	it('should update a property', async () => {
		await appContext.run(ctx, async () => {
			const host = await createHost()
			const property = await makeProperty(host.id)
			await repository.save(property)

			const updated = property.update({ name: 'Updated Property' })
			await repository.update(updated)

			const found = await repository.findById(property.id)
			expect(found!.name).toBe('Updated Property')
		})
	})

	it('should soft delete a property', async () => {
		await appContext.run(ctx, async () => {
			const host = await createHost()
			const property = await makeProperty(host.id)
			await repository.save(property)

			const deleted = property.delete()
			await repository.delete(deleted)

			const found = await repository.findById(property.id)
			expect(found).toBeNull()
		})
	})

	it('should return null when property is not found', async () => {
		await appContext.run(ctx, async () => {
			const found = await repository.findById(UniqueId('non-existent-id'))
			expect(found).toBeNull()
		})
	})

	it('should throw PropertyNotFoundError on getById for non-existent property', async () => {
		await appContext.run(ctx, async () => {
			await expect(
				repository.getById(UniqueId('non-existent-id'))
			).rejects.toThrow(PropertyNotFoundError)
		})
	})

	it('should find many properties by host id', async () => {
		await appContext.run(ctx, async () => {
			const host1 = await createHost()
			const host2 = await createHost()

			const property1 = await makeProperty(host1.id)
			const property2 = await makeProperty(host1.id)
			const property3 = await makeProperty(host2.id)

			await repository.save(property1)
			await repository.save(property2)
			await repository.save(property3)

			const found = await repository.findManyByHostId(host1.id)
			expect(found).toHaveLength(2)
			expect(found.map(p => p.id)).toEqual(
				expect.arrayContaining([property1.id, property2.id])
			)
		})
	})

	it('should exclude soft-deleted properties from findManyByHostId', async () => {
		await appContext.run(ctx, async () => {
			const host = await createHost()
			const property = await makeProperty(host.id)
			await repository.save(property)

			const deleted = property.delete()
			await repository.delete(deleted)

			const found = await repository.findManyByHostId(host.id)
			expect(found).toHaveLength(0)
		})
	})
})
