import { z } from 'zod'

export const authenticatedUserSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.email(),
	role: z.string(),
})

export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>
