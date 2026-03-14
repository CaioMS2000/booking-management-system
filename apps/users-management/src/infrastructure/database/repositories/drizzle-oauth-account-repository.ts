import { and, eq } from 'drizzle-orm'
import {
	type OAuthAccountRecord,
	OAuthAccountRepository,
} from '@/application/repositories/oauth-account-repository'
import { oauthAccounts } from '@/infrastructure/database/schema'
import { database } from '@/lib/drizzle'

export class DrizzleOAuthAccountRepository extends OAuthAccountRepository {
	async findByProviderAndAccountId(
		provider: string,
		providerAccountId: string
	): Promise<OAuthAccountRecord | null> {
		const [row] = await database
			.select()
			.from(oauthAccounts)
			.where(
				and(
					eq(oauthAccounts.provider, provider),
					eq(oauthAccounts.providerAccountId, providerAccountId)
				)
			)
			.limit(1)

		if (!row) return null

		return {
			id: row.id,
			userId: row.userId,
			provider: row.provider,
			providerAccountId: row.providerAccountId,
		}
	}

	async save(data: {
		userId: string
		provider: string
		providerAccountId: string
	}): Promise<{ id: string }> {
		const [row] = await database
			.insert(oauthAccounts)
			.values({
				userId: data.userId,
				provider: data.provider,
				providerAccountId: data.providerAccountId,
			})
			.returning({ id: oauthAccounts.id })

		return { id: row.id }
	}
}
