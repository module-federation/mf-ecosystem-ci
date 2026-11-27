import { installPlaywright, runInRepo } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/** Published from the downstream repo itself; built from source, never overridden. */
export const owns = ['@module-federation/vinext']

export const covers = ['@module-federation/vite', '@module-federation/runtime', '@module-federation/sdk']

/**
 * module-federation/vinext: Module Federation for vinext (Next.js on Vite), with an SSR
 * host, a remote and an isolated React island. Runs its `check` (typecheck, test, build)
 * and the Playwright suite against the production servers.
 */
export async function test(options: RunOptions) {
	await runInRepo({
		...options,
		repo: 'module-federation/vinext',
		build: 'check',
		test: [installPlaywright, 'test:e2e'],
	})
}
