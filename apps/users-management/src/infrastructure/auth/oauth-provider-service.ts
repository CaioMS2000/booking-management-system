import { Facebook, Google, generateCodeVerifier, generateState } from 'arctic'
import { decodeJwt } from 'jose'

export type OAuthProvider = 'google' | 'facebook'

export type OAuthUserProfile = {
	providerAccountId: string
	email: string
	name: string
}

type OAuthProviderServiceConfig = {
	googleClientId: string
	googleClientSecret: string
	googleRedirectUri: string
	facebookClientId: string
	facebookClientSecret: string
	facebookRedirectUri: string
}

export class OAuthProviderService {
	private google: Google
	private facebook: Facebook

	constructor(config: OAuthProviderServiceConfig) {
		this.google = new Google(
			config.googleClientId,
			config.googleClientSecret,
			config.googleRedirectUri
		)
		this.facebook = new Facebook(
			config.facebookClientId,
			config.facebookClientSecret,
			config.facebookRedirectUri
		)
	}

	createAuthorizationURL(provider: OAuthProvider): {
		url: URL
		state: string
		codeVerifier: string
	} {
		const state = generateState()
		const codeVerifier = generateCodeVerifier()

		if (provider === 'google') {
			const url = this.google.createAuthorizationURL(state, codeVerifier, [
				'openid',
				'profile',
				'email',
			])
			return { url, state, codeVerifier }
		}

		const url = this.facebook.createAuthorizationURL(state, [
			'email',
			'public_profile',
		])
		return { url, state, codeVerifier }
	}

	async validateCodeAndGetProfile(
		provider: OAuthProvider,
		code: string,
		codeVerifier: string
	): Promise<OAuthUserProfile> {
		if (provider === 'google') {
			return this.getGoogleProfile(code, codeVerifier)
		}

		return this.getFacebookProfile(code)
	}

	private async getGoogleProfile(
		code: string,
		codeVerifier: string
	): Promise<OAuthUserProfile> {
		const tokens = await this.google.validateAuthorizationCode(
			code,
			codeVerifier
		)
		const idToken = tokens.idToken()
		const claims = decodeJwt(idToken)

		return {
			providerAccountId: claims.sub!,
			email: claims.email as string,
			name: claims.name as string,
		}
	}

	private async getFacebookProfile(code: string): Promise<OAuthUserProfile> {
		const tokens = await this.facebook.validateAuthorizationCode(code)
		const accessToken = tokens.accessToken()

		const response = await fetch(
			`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
		)

		if (!response.ok) {
			throw new Error(`Facebook API error: ${response.status}`)
		}

		const profile = (await response.json()) as {
			id: string
			name: string
			email: string
		}

		return {
			providerAccountId: profile.id,
			email: profile.email,
			name: profile.name,
		}
	}
}
