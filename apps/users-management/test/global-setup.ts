import { config } from 'dotenv'
import { randomBytes } from 'node:crypto'
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import Redis from 'ioredis'

config({ path: '.env.test' })

const schemaId = `test_${randomBytes(8).toString('hex')}`
const baseDatabaseUrl = process.env.DATABASE_URL!

export async function setup() {
	const client = new pg.Client({ connectionString: baseDatabaseUrl })
	await client.connect()

	try {
		await client.query(`CREATE SCHEMA "${schemaId}"`)
		await client.query(`SET search_path TO "${schemaId}"`)

		execSync('npx drizzle-kit generate', {
			cwd: process.cwd(),
			stdio: 'pipe',
		})

		const migrationsDir = join(process.cwd(), '.drizzle')
		const sqlFiles = readdirSync(migrationsDir)
			.filter(f => f.endsWith('.sql'))
			.sort()

		for (const file of sqlFiles) {
			let sql = readFileSync(join(migrationsDir, file), 'utf-8')
			sql = sql.replaceAll('"public".', '')
			sql = sql.replaceAll('--> statement-breakpoint', '')
			await client.query(sql)
		}
	} finally {
		await client.end()
	}

	const separator = baseDatabaseUrl.includes('?') ? '&' : '?'
	process.env.DATABASE_URL = `${baseDatabaseUrl}${separator}options=-c%20search_path%3D${schemaId}`

	console.log(`\n[test] Created schema "${schemaId}"`)
}

export async function teardown() {
	const client = new pg.Client({ connectionString: baseDatabaseUrl })
	await client.connect()
	try {
		await client.query(`DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`)
	} finally {
		await client.end()
	}

	const redis = new Redis(process.env.REDIS_URL!)
	await redis.flushdb()
	await redis.quit()

	console.log(`[test] Dropped schema "${schemaId}"\n`)
}
