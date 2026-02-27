import { anything, instance, mock, when } from '@johanblumenberg/ts-mockito'
import { describe, expect, it, beforeEach } from 'vitest'
import { Name } from '@repo/core'
import { appContext } from '@/application-context'
import { HostNotFoundError } from '../@errors'
import { HostRepository } from '../repositories/host-repository'
import { PropertyRepository } from '../repositories/property-repository'
import { makeAppContext } from '@/modules/property-module/test/factories/make-app-context'
import { makeHost } from '@/modules/property-module/test/factories/make-host'
import { makeAddress } from '@/modules/property-module/test/factories/make-address'
import { CreatePropertyUseCase } from './create-property-use-case'

describe('CreatePropertyUseCase', () => {
	let hostRepo: HostRepository
	let propertyRepo: PropertyRepository
	let sut: CreatePropertyUseCase

	beforeEach(() => {
		hostRepo = mock(HostRepository)
		propertyRepo = mock(PropertyRepository)
		sut = new CreatePropertyUseCase({
			hostRepository: instance(hostRepo),
			propertyRepository: instance(propertyRepo),
		})
	})

	it('should return failure when host is not found', () => {
		return appContext.run(makeAppContext(), async () => {
			when(hostRepo.findById(anything())).thenResolve(null)

			const result = await sut.execute({
				hostId: 'non-existent-id',
				name: Name('Beach House'),
				description: 'A nice beach house',
				capacity: 6,
				propertyType: 'House',
				address: makeAddress(),
				imagesUrls: ['https://example.com/img.jpg'],
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(HostNotFoundError)
		})
	})

	it('should return success with created property', () => {
		return appContext.run(makeAppContext(), async () => {
			const host = await makeHost()
			when(hostRepo.findById(anything())).thenResolve(host)
			when(propertyRepo.save(anything())).thenResolve()

			const address = makeAddress()
			const result = await sut.execute({
				hostId: host.id.toString(),
				name: Name('Beach House'),
				description: 'A nice beach house',
				capacity: 6,
				propertyType: 'House',
				address,
				imagesUrls: ['https://example.com/img.jpg'],
			})

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				const { property } = result.value
				expect(property.name).toBe('Beach House')
				expect(property.description).toBe('A nice beach house')
				expect(property.capacity).toBe(6)
				expect(property.type).toBe('House')
				expect(property.address).toEqual(address)
				expect(property.imagesUrls).toEqual(['https://example.com/img.jpg'])
			}
		})
	})
})
