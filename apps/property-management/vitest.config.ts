import { defineConfig } from 'vitest/config'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	test: {
		globals: true,
		root: './',
		fileParallelism: false,
		globalSetup: ['./test/global-setup.ts'],
		env: { NODE_ENV: 'test' },
	},
	plugins: [tsConfigPaths({})],
})
