import {
	UniqueId,
	UUIDV4Generator,
	UUIDV7Generator,
	DefaultIncrementalIdGenerator,
} from '@repo/core'
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { appContext } from '@/context/application-context'
import { HostNotFoundError } from '@/modules/property-module/application/@errors/host-not-found-error'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import {
	setupDatabase,
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
const repository = new DrizzleHostRepository()
const propertyRepository = new DrizzlePropertyRepository()

describe('DrizzleHostRepository', () => {
	beforeAll(async () => {
		await setupDatabase()
	})

	afterEach(async () => {
		await cleanDatabase()
	})

	afterAll(async () => {
		await closeDatabase()
	})

	it('should save and find a host by id', async () => {
		await appContext.run(ctx, async () => {
			const host = await makeHost()

			await repository.save(host)
			const found = await repository.findById(host.id)

			expect(found).not.toBeNull()
			expect(found!.id).toBe(host.id)
			expect(found!.name).toBe(host.name)
			expect(found!.email.value).toBe(host.email.value)
			expect(found!.phone.value).toBe(host.phone.value)
			expect(found!.propertiesIds).toEqual([])
		})
	})

	it('should update a host', async () => {
		await appContext.run(ctx, async () => {
			const host = await makeHost()
			await repository.save(host)

			const updated = host.update({ name: 'Updated Name' })
			await repository.update(updated)

			const found = await repository.findById(host.id)
			expect(found!.name).toBe('Updated Name')
		})
	})

	it('should return null when host is not found', async () => {
		await appContext.run(ctx, async () => {
			const found = await repository.findById(UniqueId('non-existent-id'))
			expect(found).toBeNull()
		})
	})

	it('should return host via getById', async () => {
		await appContext.run(ctx, async () => {
			const host = await makeHost()
			await repository.save(host)

			const found = await repository.getById(host.id)
			expect(found.id).toBe(host.id)
		})
	})

	it('should throw HostNotFoundError on getById for non-existent host', async () => {
		await appContext.run(ctx, async () => {
			await expect(
				repository.getById(UniqueId('non-existent-id'))
			).rejects.toThrow(HostNotFoundError)
		})
	})

	it('should return propertiesIds when host has properties', async () => {
		await appContext.run(ctx, async () => {
			const host = await makeHost()
			await repository.save(host)

			const property = await makeProperty(host.id)
			await propertyRepository.save(property)

			const found = await repository.findById(host.id)
			expect(found!.propertiesIds).toContain(property.id)
		})
	})
})
