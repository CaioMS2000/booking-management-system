import { hash, verify } from '@node-rs/argon2'

// Algorithm.Argon2id = 2 (const enum, can't import at runtime with isolatedModules)
const ARGON2ID = 2

export class PasswordService {
	async hash(password: string): Promise<string> {
		return hash(password, { algorithm: ARGON2ID })
	}

	async verify(hashed: string, password: string): Promise<boolean> {
		return verify(hashed, password)
	}
}
