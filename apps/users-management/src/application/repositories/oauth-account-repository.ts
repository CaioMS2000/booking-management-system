export type OAuthAccountRecord = {
	id: string
	userId: string
	provider: string
	providerAccountId: string
}

export abstract class OAuthAccountRepository {
	abstract findByProviderAndAccountId(
		provider: string,
		providerAccountId: string
	): Promise<OAuthAccountRecord | null>

	abstract save(data: {
		userId: string
		provider: string
		providerAccountId: string
	}): Promise<{ id: string }>
}
