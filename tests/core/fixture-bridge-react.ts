import { installPlaywright, runFixture } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/**
 * @module-federation/bridge-react through an rsbuild host + remote (React 18, react-router 6),
 * modelled on core's apps/router-demo. The rspack MF plugin applies
 * bridge-react-webpack-plugin because both apps depend on bridge-react; `build` checks the
 * bundles for its react-router-dom alias, and Playwright checks the bridge in a browser
 * (render, props, basename routing, host-to-remote route sync, memoryRoute).
 */
export const covers = [
	'@module-federation/bridge-react',
	'@module-federation/bridge-react-webpack-plugin',
]

export async function test(options: RunOptions) {
	await runFixture({
		...options,
		fixture: 'bridge-react',
		build: 'build',
		beforeTest: () => installPlaywright(),
		test: 'test:e2e',
	})
}
