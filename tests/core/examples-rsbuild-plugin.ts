import { runExamples } from '../_shared/examples.ts'
import type { RunOptions } from '../../types.d.ts'

/** @module-federation/rsbuild-plugin, including an mf-manifest.json based example. */
export const covers = [
	'@module-federation/rsbuild-plugin',
	'@module-federation/manifest',
	'@module-federation/managers',
	'@module-federation/enhanced',
	'@module-federation/rspack',
	'@module-federation/runtime',
	'@module-federation/runtime-core',
	'@module-federation/runtime-tools',
	'@module-federation/sdk',
	'@module-federation/error-codes',
	'@module-federation/webpack-bundler-runtime',
]

export async function test(options: RunOptions) {
	await runExamples(options, ['react-preact-runtime-typescript', 'cra', 'react-manifest-example'])
}
