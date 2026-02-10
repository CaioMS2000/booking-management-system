import { defineConfig } from 'vitest/config'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	test: {
		globals: true,
		root: './',
	},
	plugins: [
		tsConfigPaths({
			projects: ['./tsconfig.json', '../../packages/core/tsconfig.json'],
		}),
	],
})
