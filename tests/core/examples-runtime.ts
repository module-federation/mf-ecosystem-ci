import { runExamples } from '../_shared/examples.ts'
import type { RunOptions } from '../../types.d.ts'

/** @module-federation/runtime, runtime-tools and sdk used directly: dynamic remotes, error boundaries, federated npm. */
export const covers = [
	'@module-federation/runtime',
	'@module-federation/runtime-core',
	'@module-federation/runtime-tools',
	'@module-federation/sdk',
	'@module-federation/error-codes',
	'@module-federation/webpack-bundler-runtime',
]

export async function test(options: RunOptions) {
	await runExamples(options, ['error-boundary', 'federated-npm', 'dynamic-system-host', 'comprehensive-demo-react18', 'clo'])
}
