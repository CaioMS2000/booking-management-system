import z from 'zod'

type RouteSchemas = {
	body: z.ZodType<any>
	response: Record<number, z.ZodType<any> | Record<string, never>>
	params: z.ZodType<any>
	querystring: z.ZodType<any>
}

export type RouteConfig = Partial<RouteSchemas>
