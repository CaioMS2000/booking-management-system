import { IdGenerator, UniqueId } from '@repo/core'

export class FakeIdGenerator extends IdGenerator {
	private counter = 0

	async generate(): Promise<UniqueId> {
		return UniqueId(`fake-id-${++this.counter}`)
	}

	async generateBatch(count: number): Promise<UniqueId[]> {
		return Promise.all(Array.from({ length: count }, () => this.generate()))
	}

	reset() {
		this.counter = 0
	}
}
