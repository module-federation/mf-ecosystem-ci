import { runExamples } from '../_shared/examples.ts'
import type { RunOptions } from '../../types.d.ts'

/** Rspack via @module-federation/enhanced/rspack (which is @module-federation/rspack), including webpack interop. */
export const covers = [
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
	await runExamples(options, ['rspack-webpack-interop', 'rspack-webpack-offload', 'complete-react-case', 'different-react-versions', 'css-isolation'])
}
