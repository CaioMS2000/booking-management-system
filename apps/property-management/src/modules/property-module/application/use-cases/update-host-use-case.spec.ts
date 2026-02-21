import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { appContext } from '@/application-context'
import {
	HostNotFoundError,
	InvalidEmailError,
	InvalidPhoneError,
} from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { UpdateHostUseCase } from './update-host-use-case'

describe('UpdateHostUseCase', () => {
	let hostRepo: HostRepository
	let sut: UpdateHostUseCase

	beforeEach(() => {
		hostRepo = mock(HostRepository)
		sut = new UpdateHostUseCase({
			hostRepository: instance(hostRepo),
		})
	})

	it('should return failure when host is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(hostRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				hostId: 'non-existent-id',
				name: 'New Name',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(HostNotFoundError)
		})
	})

	it('should return failure when email is invalid', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			when(hostRepo.findById(anything())).thenResolve(host)

			const result = await sut.execute({
				hostId: host.id,
				email: 'invalid-email',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidEmailError)
		})
	})

	it('should return failure when phone is invalid', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			when(hostRepo.findById(anything())).thenResolve(host)

			const result = await sut.execute({
				hostId: host.id,
				phone: '123',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidPhoneError)
		})
	})

	it('should update host name successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			when(hostRepo.findById(anything())).thenResolve(host)
			when(hostRepo.update(anything())).thenResolve()

			const result = await sut.execute({
				hostId: host.id,
				name: 'Updated Name',
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.host.name).toBe('Updated Name')
				expect(result.value.host.email).toEqual(host.email)
				expect(result.value.host.phone).toEqual(host.phone)
			}
			verify(hostRepo.update(anything())).once()
		})
	})

	it('should update host email successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			when(hostRepo.findById(anything())).thenResolve(host)
			when(hostRepo.update(anything())).thenResolve()

			const result = await sut.execute({
				hostId: host.id,
				email: 'new@email.com',
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.host.email.value).toBe('new@email.com')
			}
		})
	})
})
