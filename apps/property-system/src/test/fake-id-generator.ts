import { IdGenerator, UniqueEntityID } from '@repo/core'

export class FakeIdGenerator extends IdGenerator {
	private counter = 0

	async generate(): Promise<UniqueEntityID> {
		return new UniqueEntityID(`fake-id-${++this.counter}`)
	}

	async generateBatch(count: number): Promise<UniqueEntityID[]> {
		return Promise.all(Array.from({ length: count }, () => this.generate()))
	}

	reset() {
		this.counter = 0
	}
}
