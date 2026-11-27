import { installPlaywright, runInRepo } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/** Published from the downstream repo itself; built from source, never overridden. */
export const owns = ['@module-federation/nuxt']

export const covers = [
	'@module-federation/vite',
	'@module-federation/enhanced',
	'@module-federation/bridge-vue3',
	'@module-federation/runtime',
	'@module-federation/sdk',
]

/**
 * module-federation/nuxt: the Nuxt module, with Vite and Rspack host/remote apps.
 * Mirrors its CI: build the module and all four apps, run the release tests, then
 * Playwright against production and dev servers.
 */
export async function test(options: RunOptions) {
	await runInRepo({
		...options,
		repo: 'module-federation/nuxt',
		build: [
			'build:package',
			'pnpm --filter nuxt-remote exec nuxt build',
			'pnpm --filter nuxt-host exec nuxt build',
			'pnpm --filter nuxt-remote-rspack exec nuxt build',
			'pnpm --filter nuxt-host-rspack exec nuxt build',
		],
		test: ['typecheck', 'test', installPlaywright, 'test:e2e', 'test:e2e:dev'],
	})
}
