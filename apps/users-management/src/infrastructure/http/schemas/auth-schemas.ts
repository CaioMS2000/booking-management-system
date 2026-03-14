import { z } from 'zod'

export const registerBodySchema = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	password: z.string().min(8),
	phone: z.string().min(1),
	role: z.enum(['HOST', 'GUEST', 'ADMIN']),
})

export const setPasswordBodySchema = z.object({
	password: z.string().min(8),
})

export const loginBodySchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
})

const userResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	role: z.string(),
})

export const authResponseSchema = z.object({
	accessToken: z.string(),
	user: userResponseSchema,
})

export const refreshResponseSchema = z.object({
	accessToken: z.string(),
})

export const userIdParamsSchema = z.object({
	id: z.string(),
})

export const updateHostBodySchema = z.object({
	name: z.string().min(1).optional(),
	email: z.string().email().optional(),
	phone: z.string().min(1).optional(),
})

export const updateGuestBodySchema = z.object({
	name: z.string().min(1).optional(),
	email: z.string().email().optional(),
	phone: z.string().min(1).optional(),
})

export const updateAdminBodySchema = z.object({
	name: z.string().min(1).optional(),
	email: z.string().email().optional(),
	phone: z.string().min(1).optional(),
})

export const hostResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	phone: z.string(),
	deletedAt: z.string().nullable(),
})

export const guestResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	phone: z.string(),
	deletedAt: z.string().nullable(),
})

export const adminResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	phone: z.string(),
	deletedAt: z.string().nullable(),
})
