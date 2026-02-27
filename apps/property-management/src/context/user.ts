import { z } from 'zod'

export const AuthenticatedUserRoles = ['HOST', 'GUEST', 'ADMIN'] as const
export type AuthenticatedUserRoles = (typeof AuthenticatedUserRoles)[number]

export const authenticatedUserSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.email(),
	role: z.enum(AuthenticatedUserRoles),
})

export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>
