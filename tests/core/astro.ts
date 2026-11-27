import { runInRepo } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/** Published from the downstream repo itself; built from source, never overridden. */
export const owns = ['@module-federation/astro']

export const covers = [
	'@module-federation/vite',
	'@module-federation/runtime',
	'@module-federation/sdk',
]

/** module-federation/astro builds on @module-federation/vite, runtime and sdk. */
export async function test(options: RunOptions) {
	await runInRepo({
		...options,
		repo: 'module-federation/astro',
		build: 'build',
		test: ['test', 'build:remote', 'build:host'],
	})
}
