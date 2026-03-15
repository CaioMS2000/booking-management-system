import { IdGenerator, UniqueId } from '@repo/core'

class NoopIdGenerator extends IdGenerator {
	generate(): Promise<UniqueId> {
		return Promise.resolve(UniqueId(''))
	}

	generateBatch(count: number): Promise<UniqueId[]> {
		return Promise.resolve(Array.from({ length: count }, () => UniqueId('')))
	}
}

export const noopIdGenerator = new NoopIdGenerator()
