import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { appContext } from '@/context/application-context'
import { HostNotFoundError, PropertyNotFoundError } from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { PropertyRepository } from '../repositories/property-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { GetPropertyUseCase } from './get-property-use-case'

describe('GetPropertyUseCase', () => {
	let hostRepo: HostRepository
	let propertyRepo: PropertyRepository
	let sut: GetPropertyUseCase

	beforeEach(() => {
		hostRepo = mock(HostRepository)
		propertyRepo = mock(PropertyRepository)
		sut = new GetPropertyUseCase({
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
				hostId: host.id.toString(),
				propertyId: 'non-existent-property',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(PropertyNotFoundError)
		})
	})

	it('should return success with property', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property = await makeProperty(host.id)

			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.findById(anything())).thenResolve(property)

			const result = await sut.execute({
				hostId: host.id,
				propertyId: property.id,
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.property).toEqual(property)
			}
		})
	})
})
