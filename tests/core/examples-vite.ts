import { runExamples } from '../_shared/examples.ts'
import type { RunOptions } from '../../types.d.ts'

/** Vite plugin examples; under --stack core this exercises the runtime/sdk the Vite plugin uses. */
export const covers = [
	'@module-federation/vite',
	'@module-federation/runtime',
	'@module-federation/sdk',
]

export async function test(options: RunOptions) {
	await runExamples(options, ['module-federation-vite-react', 'module-federation-vite-vue3', 'module-federation-vite-svelte', 'react-webpack-host-vite-remote', 'shared-directory'])
}
