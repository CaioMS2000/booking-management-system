import { uuidv7 } from 'uuidv7'
import { UniqueId } from '../unique-id'
import { IdGenerator } from './id-generator'

export class UUIDV7Generator extends IdGenerator {
	generate(prefix?: string): Promise<UniqueId> {
		const uuid = uuidv7()
		const id = prefix ? `${prefix}:${uuid}` : uuid

		return Promise.resolve(UniqueId(id))
	}

	generateBatch(count: number, prefix?: string): Promise<UniqueId[]> {
		const ids = Array.from({ length: count }, () => this.generate(prefix))
		return Promise.all(ids)
	}
}
