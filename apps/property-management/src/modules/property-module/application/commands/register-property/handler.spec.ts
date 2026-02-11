import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { UniqueEntityID } from '@repo/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { HostNotFoundError } from '@/modules/property-module/application/@errors'
import { HostRepository } from '@/modules/property-module/application/repositories/host-repository'
import { PropertyRepository } from '@/modules/property-module/application/repositories/property-repository'
import { appContext } from '@/modules/property-module/application-context'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { RegisterPropertyCommand } from './command'
import { RegisterPropertyCommandHandler } from './handler'

describe('RegisterPropertyCommandHandler', () => {
	let hostRepo: HostRepository
	let propertyRepo: PropertyRepository
	let sut: RegisterPropertyCommandHandler

	beforeEach(() => {
		hostRepo = mock(HostRepository)
		propertyRepo = mock(PropertyRepository)
		sut = new RegisterPropertyCommandHandler(
			instance(hostRepo),
			instance(propertyRepo)
		)
	})

	it('should return failure when host is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(hostRepo.findById(anything())).thenResolve(null)

			const command = await RegisterPropertyCommand.create({
				hostId: new UniqueEntityID('non-existent-id'),
				name: 'Beach House',
				description: 'A nice beach house',
				capacity: 4,
				pricePerNight: { valueInCents: 15000, currency: 'BRL' },
				propertyType: 'Apartment',
				address: {
					street: 'Rua X',
					city: 'São Paulo',
					state: 'SP',
					country: 'BR',
					zipCode: '01234567',
				},
				publicId: 1,
			})

			const result = await sut.execute(command)

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(HostNotFoundError)
			verify(propertyRepo.save(anything())).never()
		})
	})

	it('should create and save property successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			when(hostRepo.findById(host.id)).thenResolve(host)
			when(propertyRepo.save(anything())).thenResolve()

			const command = await RegisterPropertyCommand.create({
				hostId: host.id,
				name: 'Beach House',
				description: 'A nice beach house',
				capacity: 4,
				pricePerNight: { valueInCents: 15000, currency: 'BRL' },
				propertyType: 'Apartment',
				address: {
					street: 'Rua X',
					city: 'São Paulo',
					state: 'SP',
					country: 'BR',
					zipCode: '01234567',
				},
				publicId: 1,
			})

			const result = await sut.execute(command)

			expect(result.isSuccess()).toBe(true)
			verify(propertyRepo.save(anything())).once()
		})
	})
})
