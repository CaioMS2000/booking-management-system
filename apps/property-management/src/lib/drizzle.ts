import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'

import { env } from '@/config/env'
import * as bookingSchema from '@/modules/booking-module/infrastructure/database/schemas/drizzle'
import * as propertySchema from '@/modules/property-module/infrastructure/database/schemas/drizzle'

console.log(`Drizzle using ${env.DATABASE_URL}`)
export const database = drizzle(env.DATABASE_URL, {
	schema: { ...propertySchema, ...bookingSchema },
})
