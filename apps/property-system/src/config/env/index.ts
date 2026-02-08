import { config } from 'dotenv'
import { z } from 'zod'

config({
	path: '.env',
	// override: process.env.NODE_ENV !== 'production',
	override: true,
})

export const envSchema = z.object({
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),
	DATABASE_URL: z.string(),
	PORT: z.coerce.number().catch(8000),

	// Better-auth
	APP_BASE_URL: z.string().optional(),

	// WhatsApp API
	VERIFICATION_TOKEN: z.string(),
	WPP_TOKEN: z.string(),
	PHONE_NUMBER_ID: z.string(),

	// File storage related
	AWS_ACCESS_KEY_ID: z.string(),
	AWS_SECRET_ACCESS_KEY: z.string(),
	AWS_BUCKET_NAME: z.string(),
	CLOUDFLARE_ACCOUNT_ID: z.string(),
	CLOUDFLARE_ENDPOINT: z.string(),
})

const env = envSchema.parse(process.env)

export { env }
