import { z } from 'zod'

const moneySchema = z.object({
	valueInCents: z.number().int().positive(),
	currency: z.enum(['USD', 'BRL']),
})

const intervalStatusSchema = z.enum([
	'AVAILABLE',
	'BLOCKED',
	'HOLD',
	'RESERVED',
])

const dateIntervalInputSchema = z.object({
	from: z.string().datetime(),
	to: z.string().datetime(),
	status: intervalStatusSchema,
	expiresAt: z.string().datetime().optional(),
})

const dateIntervalResponseSchema = z.object({
	from: z.string(),
	to: z.string(),
	status: intervalStatusSchema,
	expiresAt: z.string().optional(),
})

export const listingResponseSchema = z.object({
	id: z.string(),
	propertyId: z.string(),
	publicId: z.number(),
	pricePerNight: moneySchema,
	intervals: z.array(dateIntervalResponseSchema),
	deletedAt: z.string().nullable(),
})

export const createListingBodySchema = z.object({
	propertyId: z.string(),
	pricePerNight: moneySchema,
	intervals: z.array(dateIntervalInputSchema).optional(),
})

export const updateListingBodySchema = z.object({
	pricePerNight: moneySchema.optional(),
	intervals: z.array(dateIntervalInputSchema).optional(),
})

export const listingIdParamsSchema = z.object({
	id: z.string(),
})

export const listingFiltersQuerySchema = z.object({
	capacity: z.coerce.number().int().positive().optional(),
	minPrice: z.coerce.number().int().positive().optional(),
	maxPrice: z.coerce.number().int().positive().optional(),
	currency: z.enum(['USD', 'BRL']).optional(),
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().positive().max(100).optional(),
})
