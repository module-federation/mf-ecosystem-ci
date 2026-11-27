import { installPlaywright, runInRepo } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/** Published from the downstream repo itself; built from source, never overridden. */
export const owns = ['@module-federation/tanstack']

export const covers = [
	'@module-federation/vite',
	'@module-federation/rsbuild-plugin',
	'@module-federation/runtime',
	'@module-federation/sdk',
]

/**
 * module-federation/tanstack: the TanStack Start plugin, with Vite and Rsbuild host/remote
 * apps (SSR, server functions, shared context). Same steps as its CI verify job.
 */
export async function test(options: RunOptions) {
	await runInRepo({
		...options,
		repo: 'module-federation/tanstack',
		build: 'build',
		test: ['typecheck', 'test:core', installPlaywright, 'test:e2e'],
	})
}
