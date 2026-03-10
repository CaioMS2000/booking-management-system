import { createHash, randomBytes } from 'node:crypto'
import { JWSHeaderParameters, type JWTPayload, jwtVerify, SignJWT } from 'jose'
import { getPrivateKey, getPublicKey } from './keys'

const ALG = 'RS256' satisfies JWSHeaderParameters['alg']
const ACCESS_TOKEN_EXPIRY = '10m' satisfies Parameters<
	SignJWT['setExpirationTime']
>[0]

type AccessTokenPayload = {
	sub: string
	name: string
	email: string
	role: string
}

export class TokenService {
	async signAccessToken(payload: AccessTokenPayload): Promise<string> {
		const privateKey = await getPrivateKey()

		return new SignJWT({
			name: payload.name,
			email: payload.email,
			role: payload.role,
		})
			.setProtectedHeader({ alg: ALG, kid: 'default' })
			.setSubject(payload.sub)
			.setIssuedAt()
			.setExpirationTime(ACCESS_TOKEN_EXPIRY)
			.sign(privateKey)
	}

	async verifyAccessToken(token: string): Promise<JWTPayload | null> {
		try {
			const publicKey = await getPublicKey()
			const { payload } = await jwtVerify(token, publicKey)
			return payload
		} catch {
			return null
		}
	}

	generateRefreshToken(): string {
		return randomBytes(32).toString('hex')
	}

	hashRefreshToken(token: string): string {
		return createHash('sha256').update(token).digest('hex')
	}
}
