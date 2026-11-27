import { runInRepo } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/** Published from the downstream repo itself; built from source, never overridden. */
export const owns = ['@module-federation/tauri']

export const covers = [
	'@module-federation/vite',
	'@module-federation/rsbuild-plugin',
	'@module-federation/runtime',
	'@module-federation/sdk',
]

/**
 * module-federation/tauri: the JavaScript half of the Tauri plugin plus its Rsbuild and
 * Vite host/guest frontends. The Rust crate and `tauri build` are skipped: they do not
 * consume any Module Federation package, and the frontends are what the overrides reach.
 */
export async function test(options: RunOptions) {
	await runInRepo({
		...options,
		repo: 'module-federation/tauri',
		build: [
			'build:package',
			"pnpm --filter ./example/* --filter !example-host --filter !example-vite-host run build",
			'pnpm --filter example-host exec rsbuild build',
			'pnpm --filter example-vite-host exec vite build',
		],
		test: 'test',
	})
}
