import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { env } from '@/config/env'

const JWKS = createRemoteJWKSet(new URL(env.AUTH_JWKS_URL))

export async function verifyJwt(token: string): Promise<JWTPayload | null> {
	try {
		const { payload } = await jwtVerify(token, JWKS)
		return payload
	} catch {
		return null
	}
}
