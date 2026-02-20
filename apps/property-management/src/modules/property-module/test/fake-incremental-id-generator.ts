import { IncrementalIdGenerator } from '@repo/core'

export class FakeIncrementalIdGenerator extends IncrementalIdGenerator {
	private counter = 0

	async generate(): Promise<number> {
		return ++this.counter
	}

	async generateBatch(count: number): Promise<number[]> {
		return Promise.all(Array.from({ length: count }, () => this.generate()))
	}

	reset() {
		this.counter = 0
	}
}
