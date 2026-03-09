import { IncrementalIdGenerator } from '@repo/core'

export class FakeIncrementalIdGenerator extends IncrementalIdGenerator {
	private static globalCounter = 0

	async generate(): Promise<number> {
		return ++FakeIncrementalIdGenerator.globalCounter
	}

	async generateBatch(count: number): Promise<number[]> {
		return Promise.all(Array.from({ length: count }, () => this.generate()))
	}

	static reset() {
		FakeIncrementalIdGenerator.globalCounter = 0
	}
}
