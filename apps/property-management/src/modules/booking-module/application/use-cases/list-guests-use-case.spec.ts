import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { appContext } from '@/context/application-context'
import { GuestRepository } from '../repositories/guest-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeGuest } from '@/modules/booking-module/test/factories/make-guest'
import { ListGuestsUseCase } from './list-guests-use-case'

describe('ListGuestsUseCase', () => {
	let guestRepo: GuestRepository
	let sut: ListGuestsUseCase

	beforeEach(() => {
		guestRepo = mock(GuestRepository)
		sut = new ListGuestsUseCase({
			guestRepository: instance(guestRepo),
		})
	})

	it('should return guests filtered by name', () => {
		return appContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()
			when(guestRepo.findMany(anything(), anything())).thenResolve([guest])

			const result = await sut.execute({ name: 'John Doe' })

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.guests).toHaveLength(1)
				expect(result.value.guests[0]).toEqual(guest)
			}
		})
	})

	it('should return guests filtered by email', () => {
		return appContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()
			when(guestRepo.findMany(anything(), anything())).thenResolve([guest])

			const result = await sut.execute({ email: 'john@example.com' })

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.guests).toHaveLength(1)
			}
		})
	})

	it('should return empty list when no guests match', () => {
		return appContext.run(makeAppContext(), async () => {
			when(guestRepo.findMany(anything(), anything())).thenResolve([])

			const result = await sut.execute({ name: 'Unknown' })

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.guests).toHaveLength(0)
			}
		})
	})

	it('should apply default pagination when not provided', () => {
		return appContext.run(makeAppContext(), async () => {
			when(guestRepo.findMany(anything(), anything())).thenResolve([])

			const result = await sut.execute({})

			expect(result.isSuccess()).toBe(true)
		})
	})
})
