import { env } from '@/config/env'
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '@/modules/property-module/infrastructure/database/schemas/drizzle'

console.log(`Drizzle using ${env.DATABASE_URL}`)
export const database = drizzle(env.DATABASE_URL, { schema })
