import { z } from 'zod'

const addressSchema = z.object({
	street: z.string(),
	city: z.string(),
	country: z.string(),
	state: z.string(),
	zipCode: z.string(),
})

const propertyTypeSchema = z.enum(['Apartment', 'House', 'Room'])

export const propertyResponseSchema = z.object({
	id: z.string(),
	hostId: z.string(),
	publicId: z.number(),
	name: z.string(),
	description: z.string(),
	capacity: z.number(),
	propertyType: propertyTypeSchema,
	address: addressSchema,
	imagesUrls: z.array(z.string()),
	deletedAt: z.string().nullable(),
})

export const createPropertyBodySchema = z.object({
	name: z.string().min(1),
	description: z.string().min(1),
	capacity: z.number().int().positive(),
	propertyType: propertyTypeSchema,
	address: addressSchema,
	imagesUrls: z.array(z.string().url()).optional().default([]),
})

export const updatePropertyBodySchema = z.object({
	name: z.string().min(1).optional(),
	description: z.string().min(1).optional(),
	capacity: z.number().int().positive().optional(),
	propertyType: propertyTypeSchema.optional(),
	address: addressSchema.optional(),
	imagesUrls: z.array(z.string().url()).optional(),
})

export const propertyIdParamsSchema = z.object({
	id: z.string(),
})
