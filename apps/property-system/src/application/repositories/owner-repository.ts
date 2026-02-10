import { Owner } from '@/domain/entities/owner'
import { UniqueEntityID } from '@repo/core'

export abstract class OwnerRepository {
	abstract findById(id: UniqueEntityID): Promise<Owner | null>
	abstract getById(id: UniqueEntityID): Promise<Owner>
}
