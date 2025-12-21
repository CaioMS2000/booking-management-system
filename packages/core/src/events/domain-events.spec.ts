import { DomainEvent } from './domain-event'
import { UniqueEntityID } from '../entity/unique-entity-id'
import { AggregateRoot } from '../entity/aggregate-root'
import { DomainEvents } from './domain-events'
import { vi } from 'vitest'
import { IdGenerator, UUIDV7Generator } from '../id-generator'

class CustomAggregateCreated implements DomainEvent {
	public ocurredAt: Date
	private aggregate: CustomAggregate

	constructor(aggregate: CustomAggregate) {
		this.aggregate = aggregate
		this.ocurredAt = new Date()
	}

	public getAggregateId(): UniqueEntityID {
		return this.aggregate.id
	}
}

class CustomAggregate extends AggregateRoot<null> {
	static create(id: UniqueEntityID) {
		const aggregate = new CustomAggregate(null, id)

		aggregate.addDomainEvent(new CustomAggregateCreated(aggregate))

		return aggregate
	}
}

describe('domain events', () => {
	it('should be able to dispatch and listen to events', async () => {
		const callbackSpy = vi.fn()
		const idGenerator: IdGenerator = new UUIDV7Generator()
		const id = await idGenerator.generate()

		// Subscriber cadastrado (ouvindo o evento de "resposta criada")
		DomainEvents.register(callbackSpy, CustomAggregateCreated.name)

		// Estou criando uma resposta porém SEM salvar no banco
		const aggregate = CustomAggregate.create(id)

		// Estou assegurando que o evento foi criado porém NÃO foi disparado
		expect(aggregate.domainEvents).toHaveLength(1)

		// Estou salvando a resposta no banco de dados e assim disparando o evento
		DomainEvents.dispatchEventsForAggregate(aggregate.id)

		// O subscriber ouve o evento e faz o que precisa ser feito com o dado
		expect(callbackSpy).toHaveBeenCalled()

		expect(aggregate.domainEvents).toHaveLength(0)
	})
})
