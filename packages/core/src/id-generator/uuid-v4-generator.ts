import { randomUUID } from 'node:crypto'
import { UniqueId } from '../unique-id'
import { IdGenerator } from './id-generator'

export class UUIDV4Generator extends IdGenerator {
	generate(prefix?: string): Promise<UniqueId> {
		const uuid = randomUUID()
		const id = prefix ? `${prefix}:${uuid}` : uuid

		return Promise.resolve(new UniqueId(id))
	}

	generateBatch(count: number, prefix?: string): Promise<UniqueId[]> {
		const ids = Array.from({ length: count }, () => this.generate(prefix))
		return Promise.all(ids)
	}
}
