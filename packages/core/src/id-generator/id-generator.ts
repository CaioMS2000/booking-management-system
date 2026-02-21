import { UniqueId } from '../unique-id'

export abstract class IdGenerator {
	/**
	 * Gera um ID único sequencial ofuscado.
	 * @param prefix - Prefixo opcional para namespacing (ex: 'booking', 'listing')
	 * @returns ID único no formato Base62 ofuscado
	 */
	abstract generate(prefix?: string): Promise<UniqueId>

	/**
	 * Gera múltiplos IDs em batch (otimização)
	 */
	abstract generateBatch(count: number, prefix?: string): Promise<UniqueId[]>
}
