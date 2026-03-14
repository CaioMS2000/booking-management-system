import { config } from 'dotenv'
import { z } from 'zod'

const isTest = process.env.NODE_ENV === 'test'

config({
	path: isTest ? '.env.test' : '.env',
	override: !isTest,
})

export const envSchema = z.object({
	// Environment machine
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),

	// HTTP Server
	PORT: z.coerce.number().catch(8000),

	// JWT (RS256)
	JWT_PRIVATE_KEY: z.string(),
	JWT_PUBLIC_KEY: z.string(),

	// Database
	DATABASE_URL: z.string(),

	// Redis
	REDIS_URL: z.string().default('redis://:redis123@localhost:6379'),

	// OAuth - Google
	GOOGLE_CLIENT_ID: z.string().default(''),
	GOOGLE_CLIENT_SECRET: z.string().default(''),
	GOOGLE_REDIRECT_URI: z.string().default(''),

	// OAuth - Facebook
	FACEBOOK_CLIENT_ID: z.string().default(''),
	FACEBOOK_CLIENT_SECRET: z.string().default(''),
	FACEBOOK_REDIRECT_URI: z.string().default(''),

	// OAuth - Frontend callback URL
	OAUTH_FRONTEND_CALLBACK_URL: z.string().default(''),
})

const env = envSchema.parse(process.env)

export { env }
