import { z } from 'zod'

export const oauthProviderParamSchema = z.object({
	provider: z.enum(['google', 'facebook']),
})

export const oauthCallbackQuerySchema = z.object({
	code: z.string(),
	state: z.string(),
	error: z.string().optional(),
})
