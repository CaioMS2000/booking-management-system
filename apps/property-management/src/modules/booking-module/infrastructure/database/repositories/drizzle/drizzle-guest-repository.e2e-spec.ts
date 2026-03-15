import { Email, Name, Phone, UniqueId } from '@repo/core'
import { afterAll, afterEach, describe, expect, it } from 'vitest'

import { requestContext } from '@/context/request-context'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeGuest } from '@/modules/booking-module/test/factories/make-guest'
import {
	cleanDatabase,
	closeDatabase,
} from '@/modules/booking-module/test/setup-database'
import { DrizzleGuestRepository } from './drizzle-guest-repository'

const ctx = makeAppContext()
const repository = new DrizzleGuestRepository()

describe('DrizzleGuestRepository', () => {
	afterEach(async () => {
		await cleanDatabase()
	})

	afterAll(async () => {
		await closeDatabase()
	})

	it('should save and find a guest by id', async () => {
		await requestContext.run(ctx, async () => {
			const guest = await makeGuest()

			await repository.save(guest)
			const found = await repository.findById(guest.id)

			expect(found).not.toBeNull()
			expect(found!.id).toBe(guest.id)
			expect(found!.name).toBe(guest.name)
			expect(found!.email.value).toBe(guest.email.value)
			expect(found!.phone.value).toBe(guest.phone.value)
		})
	})

	it('should return null when guest is not found', async () => {
		await requestContext.run(ctx, async () => {
			const found = await repository.findById(UniqueId('non-existent-id'))
			expect(found).toBeNull()
		})
	})

	it('should update a guest', async () => {
		await requestContext.run(ctx, async () => {
			const guest = await makeGuest()
			await repository.save(guest)

			const updated = guest.update({ name: Name('Jane Doe') })
			await repository.update(updated)

			const found = await repository.findById(guest.id)
			expect(found!.name).toBe('Jane Doe')
		})
	})

	it('should soft delete a guest', async () => {
		await requestContext.run(ctx, async () => {
			const guest = await makeGuest()
			await repository.save(guest)

			await repository.delete(guest)

			const found = await repository.findById(guest.id)
			expect(found).toBeNull()
		})
	})

	it('should find many guests without filters', async () => {
		await requestContext.run(ctx, async () => {
			const guest1 = await makeGuest()
			const guest2 = await makeGuest({
				overrides: {
					email: Email.create('jane@example.com').value as Email,
					phone: Phone.create('+5511888888888').value as Phone,
				},
			})

			await repository.save(guest1)
			await repository.save(guest2)

			const found = await repository.findMany()
			expect(found).toHaveLength(2)
		})
	})

	it('should find many guests with name filter', async () => {
		await requestContext.run(ctx, async () => {
			const guest1 = await makeGuest({
				overrides: { name: Name('Alice Smith') },
			})
			const guest2 = await makeGuest({
				overrides: {
					name: Name('Bob Jones'),
					email: Email.create('bob@example.com').value as Email,
					phone: Phone.create('+5511888888888').value as Phone,
				},
			})

			await repository.save(guest1)
			await repository.save(guest2)

			const found = await repository.findMany({ name: Name('Alice') })
			expect(found).toHaveLength(1)
			expect(found[0].name).toBe('Alice Smith')
		})
	})

	it('should find many guests with email filter', async () => {
		await requestContext.run(ctx, async () => {
			const guest1 = await makeGuest()
			const guest2 = await makeGuest({
				overrides: {
					email: Email.create('jane@other.com').value as Email,
					phone: Phone.create('+5511888888888').value as Phone,
				},
			})

			await repository.save(guest1)
			await repository.save(guest2)

			const found = await repository.findMany({
				email: Email.create('jane@other.com').value as Email,
			})
			expect(found).toHaveLength(1)
			expect(found[0].email.value).toBe('jane@other.com')
		})
	})

	it('should find many guests with pagination', async () => {
		await requestContext.run(ctx, async () => {
			const guests = await Promise.all(
				Array.from({ length: 3 }, (_, i) =>
					makeGuest({
						overrides: {
							email: Email.create(`user${i}@example.com`).value as Email,
							phone: Phone.create(`+551199999900${i}`).value as Phone,
						},
					})
				)
			)

			for (const guest of guests) {
				await repository.save(guest)
			}

			const found = await repository.findMany(undefined, {
				page: 1,
				limit: 2,
			})
			expect(found).toHaveLength(2)
		})
	})
})
