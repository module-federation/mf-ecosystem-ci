import { runExamples } from '../_shared/examples.ts'
import type { RunOptions } from '../../types.d.ts'

/** @module-federation/modern-js and modern-js-v3 (manifest-based remotes through the managers package). */
export const covers = [
	'@module-federation/modern-js',
	'@module-federation/modern-js-v3',
	'@module-federation/rsbuild-plugin',
	'@module-federation/manifest',
	'@module-federation/managers',
	'@module-federation/enhanced',
	'@module-federation/runtime',
	'@module-federation/runtime-core',
	'@module-federation/runtime-tools',
	'@module-federation/sdk',
	'@module-federation/error-codes',
	'@module-federation/webpack-bundler-runtime',
]

export async function test(options: RunOptions) {
	await runExamples(options, ['bi-directional', 'basic-host-remote', 'modernjs-ssr-data-loader', 'modernjs-ssr'])
}
