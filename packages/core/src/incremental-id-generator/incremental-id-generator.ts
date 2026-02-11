export abstract class IncrementalIdGenerator {
	abstract generate(): Promise<number>

	/**
	 * Gera múltiplos IDs em batch (otimização)
	 */
	abstract generateBatch(count: number, prefix?: string): Promise<number[]>
}
