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
	PropertyNotFoundError,
	PropertyNotOwnedByHostError,
} from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { PropertyRepository } from '../repositories/property-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { UpdatePropertyUseCase } from './update-property-use-case'
import { UniqueId } from '@repo/core'

describe('UpdatePropertyUseCase', () => {
	let hostRepo: HostRepository
	let propertyRepo: PropertyRepository
	let sut: UpdatePropertyUseCase

	beforeEach(() => {
		hostRepo = mock(HostRepository)
		propertyRepo = mock(PropertyRepository)
		sut = new UpdatePropertyUseCase({
			hostRepository: instance(hostRepo),
			propertyRepository: instance(propertyRepo),
		})
	})

	it('should return failure when host is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(hostRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				hostId: 'non-existent-id',
				propertyId: 'some-property-id',
				name: 'New Name',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(HostNotFoundError)
		})
	})

	it('should return failure when property is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				hostId: host.id,
				propertyId: 'non-existent-property',
				name: 'New Name',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(PropertyNotFoundError)
		})
	})

	it('should return failure when property does not belong to host', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const otherHost = await makeHost()
			const property = await makeProperty(otherHost.id)

			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.findById(anything())).thenResolve(property)

			const result = await sut.execute({
				hostId: host.id,
				propertyId: property.id,
				name: 'New Name',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(PropertyNotOwnedByHostError)
		})
	})

	it('should update property successfully', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)

			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.findById(anything())).thenResolve(property)
			when(propertyRepo.update(anything())).thenResolve()

			const result = await sut.execute({
				hostId: host.id,
				propertyId: property.id,
				name: 'Updated Property Name',
				capacity: 10,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.property.name).toBe('Updated Property Name')
				expect(result.value.property.capacity).toBe(10)
				expect(result.value.property.description).toBe(property.description)
			}
			verify(propertyRepo.update(anything())).once()
		})
	})
})
