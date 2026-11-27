import { runExamples } from '../_shared/examples.ts'
import type { RunOptions } from '../../types.d.ts'

/** @module-federation/nextjs-mf. */
export const covers = [
	'@module-federation/nextjs-mf',
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
	await runExamples(options, ['nextjs-csr', 'nextjs-ssr', 'nextjs-host-react-remote', 'i18next-nextjs-react'])
}
