import { UniqueEntityID } from '../../entity'

export interface DomainEvent {
	ocurredAt: Date
	getAggregateId(): UniqueEntityID
}
