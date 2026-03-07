import { config } from 'dotenv'
import { z } from 'zod'

config({
	path: '.env',
	// override: process.env.NODE_ENV !== 'production',
	override: true,
})

export const envSchema = z.object({
	// Environment machine
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),

	// HTTP Server
	PORT: z.coerce.number().catch(8000),
	AUTH_JWKS_URL: z.string(),

	// Database
	DATABASE_URL: z.string(),
})

const env = envSchema.parse(process.env)

export { env }
