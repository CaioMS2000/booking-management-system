import z from 'zod'

type RouteSchemas = {
	body: z.ZodType<any>
	response: Record<number, z.ZodType<any>>
	params: z.ZodType<any>
	querystring: z.ZodType<any>
}

export type RouteConfig = Partial<RouteSchemas>

// Example usage:
const config = {
	body: z.array(z.string()),
} satisfies RouteConfig
