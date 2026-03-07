import { pgTable, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { hosts } from './hosts'

export const properties = pgTable('properties', {
	id: text('id').primaryKey(),
	hostId: text('host_id')
		.notNull()
		.references(() => hosts.id),
	publicId: integer('public_id').notNull().unique(),
	name: text('name').notNull(),
	description: text('description').notNull(),
	capacity: integer('capacity').notNull(),
	propertyType: text('property_type').notNull(),
	street: text('street').notNull(),
	city: text('city').notNull(),
	country: text('country').notNull(),
	state: text('state').notNull(),
	zipCode: text('zip_code').notNull(),
	imagesUrls: jsonb('images_urls').$type<string[]>().default([]).notNull(),
	deletedAt: timestamp('deleted_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true })
		.default(sql`now()`)
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.default(sql`now()`)
		.notNull(),
})

export type PropertyDrizzleModel = typeof properties.$inferSelect
export type PropertyDrizzleInput = typeof properties.$inferInsert
