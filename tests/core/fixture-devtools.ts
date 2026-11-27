import { installPlaywright, runFixture } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/**
 * The two React UIs core publishes (fixtures/devtools): the devtools panel
 * (`@module-federation/devtools`) embedded next to a live MF runtime, and
 * `ModuleFederationPlayground` running its sandbox against a local rsbuild remote.
 */
export const covers = ['@module-federation/devtools', '@module-federation/playground']

export async function test(options: RunOptions) {
	await runFixture({
		...options,
		fixture: 'devtools',
		build: 'build',
		beforeTest: installPlaywright,
		test: 'test',
	})
}
