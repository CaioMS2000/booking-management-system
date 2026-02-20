import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { appContext } from '@/application-context'
import { HostNotFoundError } from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { PropertyRepository } from '../repositories/property-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeProperty } from '@/modules/property-module/test/factories/make-property'
import { GetAllPropertiesUseCase } from './get-all-properties-use-case'

describe('GetAllPropertiesUseCase', () => {
	let hostRepo: HostRepository
	let propertyRepo: PropertyRepository
	let sut: GetAllPropertiesUseCase

	beforeEach(() => {
		hostRepo = mock(HostRepository)
		propertyRepo = mock(PropertyRepository)
		sut = new GetAllPropertiesUseCase({
			hostRepository: instance(hostRepo),
			propertyRepository: instance(propertyRepo),
		})
	})

	it('should return failure when host is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(hostRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				hostId: 'non-existent-id',
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(HostNotFoundError)
		})
	})

	it('should return success with properties list', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			const property1 = await makeProperty(host.id)
			const property2 = await makeProperty(host.id)

			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.findManyByHostId(anything())).thenResolve([
				property1,
				property2,
			])

			const result = await sut.execute({
				hostId: host.id.toString(),
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.properties).toHaveLength(2)
				expect(result.value.properties).toEqual([property1, property2])
			}
		})
	})

	it('should return success with empty list when host has no properties', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()

			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.findManyByHostId(anything())).thenResolve([])

			const result = await sut.execute({
				hostId: host.id.toString(),
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.properties).toEqual([])
			}
		})
	})
})
