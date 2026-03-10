import { type JWTPayload, jwtVerify } from 'jose'
import { getPublicKey } from '@/infrastructure/auth/keys'

export async function verifyJwt(token: string): Promise<JWTPayload | null> {
	try {
		const publicKey = await getPublicKey()
		const { payload } = await jwtVerify(token, publicKey)
		return payload
	} catch {
		return null
	}
}
