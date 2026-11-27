import { runInRepo } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

export const covers = [
	'@module-federation/vite',
	'@module-federation/runtime',
	'@module-federation/sdk',
	'@module-federation/dts-plugin',
]

/** module-federation/vite consumes @module-federation/runtime, sdk and dts-plugin from core. */
export async function test(options: RunOptions) {
	await runInRepo({
		...options,
		repo: 'module-federation/vite',
		build: 'build',
		test: ['typecheck', 'test', 'test:integration'],
	})
}
