import { RefreshTokenRepository } from '@/application/repositories/refresh-token-repository'

type StoredToken = {
	userId: string
	used: boolean
	expiresAt: number
}

export class InMemoryRefreshTokenRepository extends RefreshTokenRepository {
	private tokens = new Map<string, StoredToken>()

	async save(
		userId: string,
		tokenHash: string,
		expiresInSeconds: number
	): Promise<void> {
		this.tokens.set(tokenHash, {
			userId,
			used: false,
			expiresAt: Date.now() + expiresInSeconds * 1000,
		})
	}

	async findByTokenHash(
		tokenHash: string
	): Promise<{ userId: string; used: boolean } | null> {
		const token = this.tokens.get(tokenHash)
		if (!token) return null
		if (Date.now() > token.expiresAt) {
			this.tokens.delete(tokenHash)
			return null
		}
		return { userId: token.userId, used: token.used }
	}

	async revoke(tokenHash: string): Promise<void> {
		this.tokens.delete(tokenHash)
	}

	async revokeAllForUser(userId: string): Promise<void> {
		for (const [hash, token] of this.tokens) {
			if (token.userId === userId) {
				this.tokens.delete(hash)
			}
		}
	}

	async markUsed(tokenHash: string): Promise<void> {
		const token = this.tokens.get(tokenHash)
		if (token) {
			token.used = true
		}
	}
}
