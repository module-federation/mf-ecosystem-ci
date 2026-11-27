import { installPlaywright, runFixture } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/**
 * The shared tree-shaking build service and its UI adapter (fixtures/treeshake).
 * The server is started from its published bin and from its library API (CommonJS, as
 * core's e2e loads it, then ESM); each runs real Rspack builds of a shared dependency that
 * the server installs from npm. The UI's analyze flow runs in Chromium.
 */
export const covers = ['@module-federation/treeshake-server', '@module-federation/treeshake-frontend']

export async function test(options: RunOptions) {
	await runFixture({
		...options,
		fixture: 'treeshake',
		beforeTest: () => installPlaywright(),
		test: ['test:server', 'test:frontend', 'test:esm'],
	})
}
