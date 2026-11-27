import { runExamples } from '../_shared/examples.ts'
import type { RunOptions } from '../../types.d.ts'

/** Type generation: @module-federation/typescript, dts-plugin, utilities and native-federation-*. */
export const covers = [
	'@module-federation/typescript',
	'@module-federation/dts-plugin',
	'@module-federation/utilities',
	'@module-federation/native-federation-tests',
	'@module-federation/native-federation-typescript',
	'@module-federation/enhanced',
]

export async function test(options: RunOptions) {
	await runExamples(options, ['typescript', 'typescript-react-fallback', 'typescript-project-references', 'native-federation-tests-typescript-plugins'])
}
