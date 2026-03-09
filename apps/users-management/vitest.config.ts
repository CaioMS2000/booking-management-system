import tsConfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		root: './',
		exclude: ['**/*.e2e-spec.ts', '**/node_modules/**'],
		env: { NODE_ENV: 'test' },
	},
	plugins: [tsConfigPaths({})],
})
