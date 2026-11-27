import { runInRepo } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/** Published from the downstream repo itself; built from source, never overridden. */
export const owns = ['@module-federation/electron']

export const covers = [
	'@module-federation/vite',
	'@module-federation/rsbuild-plugin',
	'@module-federation/runtime',
	'@module-federation/sdk',
]

/**
 * module-federation/electron: loads Vite and Rsbuild remotes into an Electron shell.
 * Builds everything, runs the unit tests, then launches the real app in smoke mode
 * (under xvfb on Linux, as its own CI does).
 */
export async function test(options: RunOptions) {
	const headless = process.platform === 'linux' ? 'xvfb-run --auto-servernum ' : ''
	await runInRepo({
		...options,
		repo: 'module-federation/electron',
		build: 'build',
		test: ['typecheck', 'test', `${headless}pnpm smoke`],
	})
}
