import { runExamples } from '../_shared/examples.ts'
import type { RunOptions } from '../../types.d.ts'

/** @module-federation/enhanced with webpack 5, and the runtime it injects. */
export const covers = [
	'@module-federation/enhanced',
	'@module-federation/runtime',
	'@module-federation/runtime-core',
	'@module-federation/runtime-tools',
	'@module-federation/sdk',
	'@module-federation/error-codes',
	'@module-federation/webpack-bundler-runtime',
]

export async function test(options: RunOptions) {
	await runExamples(options, ['nested-remote', 'shared-context', 'shared-routing', 'self-healing', 'typescript-monorepo', 'redux-reducer-injection'])
}
