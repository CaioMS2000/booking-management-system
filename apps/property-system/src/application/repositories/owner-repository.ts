import { Owner } from '@/domain/entities/owner'
import { UniqueEntityID } from '@repo/core'

export abstract class OwnerRepository {
	abstract get(id: UniqueEntityID): Promise<Owner>
}
