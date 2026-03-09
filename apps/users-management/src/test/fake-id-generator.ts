import { IdGenerator, UniqueId } from '@repo/core'

export class FakeIdGenerator extends IdGenerator {
	private static globalCounter = 0

	async generate(): Promise<UniqueId> {
		return UniqueId(`fake-id-${++FakeIdGenerator.globalCounter}`)
	}

	async generateBatch(count: number): Promise<UniqueId[]> {
		return Promise.all(Array.from({ length: count }, () => this.generate()))
	}

	static reset() {
		FakeIdGenerator.globalCounter = 0
	}
}
