import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { InvalidValueError } from '@repo/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { HostRepository } from '@/modules/property-module/application/repositories/host-repository'
import { appContext } from '@/modules/property-module/application-context'
import { Host } from '@/modules/property-module/domain/entities/host'
import { RegisterHostCommand } from './command'
import { RegisterHostCommandHandler } from './handler'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'

describe('RegisterHostCommandHandler', () => {
	let hostRepo: HostRepository
	let sut: RegisterHostCommandHandler

	beforeEach(() => {
		hostRepo = mock(HostRepository)
		sut = new RegisterHostCommandHandler(instance(hostRepo))
	})

	it('should return failure when email is invalid', () => {
		return appContext.run(makeAppContext(), async () => {
			const command = await RegisterHostCommand.create({
				name: 'John Doe',
				email: 'invalid-email',
				phone: '5511999999999',
			})

			const result = await sut.execute(command)

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidValueError)
		})
	})

	it('should return failure when phone is invalid', () => {
		return appContext.run(makeAppContext(), async () => {
			const command = await RegisterHostCommand.create({
				name: 'John Doe',
				email: 'john@example.com',
				phone: '',
			})

			const result = await sut.execute(command)

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidValueError)
		})
	})

	it('should create and save host successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			when(hostRepo.save(anything())).thenResolve()

			const command = await RegisterHostCommand.create({
				name: 'John Doe',
				email: 'john@example.com',
				phone: '5511999999999',
			})

			const result = await sut.execute(command)

			expect(result.isSuccess()).toBe(true)

			const host = result.value as Host
			expect(host.name).toBe('John Doe')

			verify(hostRepo.save(anything())).once()
		})
	})
})
