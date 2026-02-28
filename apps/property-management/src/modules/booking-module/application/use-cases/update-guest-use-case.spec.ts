import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { appContext } from '@/context/application-context'
import {
	GuestNotFoundError,
	InvalidEmailError,
	InvalidPhoneError,
} from '../@errors'
import { GuestRepository } from '../repositories/guest-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeGuest } from '@/modules/booking-module/test/factories/make-guest'
import { UpdateGuestUseCase } from './update-guest-use-case'

describe('UpdateGuestUseCase', () => {
	let guestRepo: GuestRepository
	let sut: UpdateGuestUseCase

	beforeEach(() => {
		guestRepo = mock(GuestRepository)
		sut = new UpdateGuestUseCase({
			guestRepository: instance(guestRepo),
		})
	})

	it('should return failure when guest is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(guestRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				guestId: 'non-existent-id',
				name: 'New Name',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(GuestNotFoundError)
			verify(guestRepo.update(anything())).never()
		})
	})

	it('should return failure when email is invalid', () => {
		return appContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()
			when(guestRepo.findById(anything())).thenResolve(guest)

			const result = await sut.execute({
				guestId: guest.id,
				email: 'invalid-email',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidEmailError)
			verify(guestRepo.update(anything())).never()
		})
	})

	it('should return failure when phone is invalid', () => {
		return appContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()
			when(guestRepo.findById(anything())).thenResolve(guest)

			const result = await sut.execute({
				guestId: guest.id,
				phone: '123',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidPhoneError)
			verify(guestRepo.update(anything())).never()
		})
	})

	it('should update guest name successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()
			when(guestRepo.findById(anything())).thenResolve(guest)
			when(guestRepo.update(anything())).thenResolve()

			const result = await sut.execute({
				guestId: guest.id,
				name: 'Jane Doe',
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.guest.name).toBe('Jane Doe')
			}
			verify(guestRepo.update(anything())).once()
		})
	})

	it('should update guest email successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			const guest = await makeGuest()
			when(guestRepo.findById(anything())).thenResolve(guest)
			when(guestRepo.update(anything())).thenResolve()

			const result = await sut.execute({
				guestId: guest.id,
				email: 'jane@example.com',
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.guest.email.value).toBe('jane@example.com')
			}
			verify(guestRepo.update(anything())).once()
		})
	})
})
