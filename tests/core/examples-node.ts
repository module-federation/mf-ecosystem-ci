import { runExamples } from '../_shared/examples.ts'
import type { RunOptions } from '../../types.d.ts'

/** @module-federation/node: server-side rendering and server-to-server federation. */
export const covers = [
	'@module-federation/node',
	'@module-federation/enhanced',
	'@module-federation/runtime',
	'@module-federation/runtime-core',
	'@module-federation/runtime-tools',
	'@module-federation/sdk',
	'@module-federation/error-codes',
	'@module-federation/webpack-bundler-runtime',
]

export async function test(options: RunOptions) {
	await runExamples(options, ['react-18-server-2-server', 'loadable-react-18', 'federated-css-react-ssr', 'apollo-client', 'react-18-code-splitting'])
}
