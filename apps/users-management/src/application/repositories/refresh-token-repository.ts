export abstract class RefreshTokenRepository {
	abstract save(
		userId: string,
		tokenHash: string,
		expiresInSeconds: number
	): Promise<void>
	abstract findByTokenHash(
		tokenHash: string
	): Promise<{ userId: string; used: boolean } | null>
	abstract revoke(tokenHash: string): Promise<void>
	abstract revokeAllForUser(userId: string): Promise<void>
	abstract markUsed(tokenHash: string): Promise<void>
}
