import { runInRepo } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

export const covers = [
	'@module-federation/vite',
	'@module-federation/enhanced',
	'@module-federation/rsbuild-plugin',
	'@module-federation/rspack',
	'@module-federation/runtime',
	'@module-federation/runtime-core',
	'@module-federation/runtime-tools',
	'@module-federation/sdk',
	'@module-federation/error-codes',
	'@module-federation/webpack-bundler-runtime',
]

/** Zephyr's bundler plugins wrap enhanced, rsbuild-plugin, runtime and the Vite plugin. */
export async function test(options: RunOptions) {
	await runInRepo({
		...options,
		repo: 'ZephyrCloudIO/zephyr-packages',
		build: 'build',
		test: ['typecheck', 'test'],
	})
}
